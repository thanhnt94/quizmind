from fastapi import APIRouter, UploadFile, File, Depends, Request, BackgroundTasks
from typing import Optional
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, Integer, or_
from sqlalchemy.orm import selectinload
from app.core.db import get_db
from app.modules.quiz.services.excel_service import ExcelQuizService
from app.modules.quiz.services.quiz_service import QuizService
from app.modules.quiz.services.ai_service import ai_service
from app.modules.quiz.schemas import QuizSchema, QuestionSchema, OptionSchema
import json
import re

router = APIRouter(prefix="/quiz", tags=["Quiz"])

@router.get("/template/download")
async def download_template():
    import os
    path = "app/static/QuizMind_Template.xlsx"
    if os.path.exists(path):
        return FileResponse(path, filename="QuizMind_Template.xlsx", media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    return {"error": "Template not found"}

@router.post("/preview")
async def preview_quiz(file: UploadFile = File(...)):
    try:
        import asyncio
        content = await file.read()
        metadata, questions = await asyncio.to_thread(ExcelQuizService.parse_quiz_excel, content)
        return {
            "metadata": metadata,
            "questions": questions,
            "count": len(questions)
        }
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@router.post("/upload")
async def upload_quiz(request: Request, file: UploadFile = File(...), metadata_override: str = None, db: AsyncSession = Depends(get_db)):
    try:
        import asyncio
        content = await file.read()
        print(f"DEBUG: Starting ingestion for {file.filename} ({len(content)} bytes)")
        
        # Run synchronous parsing in a thread to avoid blocking the event loop
        file_metadata, questions = await asyncio.to_thread(ExcelQuizService.parse_quiz_excel, content)
        
        # Apply overrides if provided
        metadata = file_metadata
        if metadata_override:
            try:
                overrides = json.loads(metadata_override)
                metadata.update(overrides)
                print(f"DEBUG: Applied metadata overrides: {overrides}")
            except Exception as e:
                print(f"ERROR: Failed to parse metadata overrides: {e}")
        
        if not questions:
            print("DEBUG: No valid questions extracted from file.")
            return JSONResponse(status_code=400, content={"error": "No valid questions found in Excel file."})

        # Use category from metadata
        category_name = metadata.get("category", "General")
        from app.modules.quiz.models import Category
        result = await db.execute(select(Category).filter(Category.name == category_name))
        db_cat = result.scalar_one_or_none()
        if not db_cat:
            db_cat = Category(name=category_name, description=f"Imported from {file.filename}")
            db.add(db_cat)
            await db.commit()
            await db.refresh(db_cat)

        # Create quiz using Info sheet metadata
        user_id = int(request.cookies.get("user_id", 1))
        quiz_data = QuizSchema(
            title=metadata.get("title", f"Import: {file.filename.split('.')[0]}"),
            description=metadata.get("description", f"Batch import with {len(questions)} questions."),
            category_id=db_cat.id,
            creator_id=user_id,
            is_active=True
        )
        db_quiz = await QuizService.create_quiz(db, quiz_data)
        
        print(f"DEBUG: Quiz created ID={db_quiz.id}. Adding {len(questions)} questions...")
        
        question_schemas = []
        for q in questions:
            question_schemas.append(QuestionSchema(
                content=q["content"],
                image=q.get("image"),
                audio=q.get("audio"),
                question_type=q.get("question_type", "normal"),
                explanation=q["explanation"],
                options=[OptionSchema(content=o["content"], is_correct=o["is_correct"]) for o in q["options"]]
            ))
        await QuizService.bulk_add_questions(db, db_quiz.id, question_schemas)
            
        # Add tags if present
        if metadata.get("tags"):
            await QuizService.set_quiz_tags(db, db_quiz.id, metadata["tags"])

        # Auto-enroll the creator so it shows in "My Collection" and "Creator Studio"
        from app.modules.quiz.models import QuizAttempt
        user_id = int(request.cookies.get("user_id", 1))
        attempt = QuizAttempt(
            user_id=user_id,
            quiz_id=db_quiz.id,
            mode="sequential",
            score=0,
            total_questions=0,
            is_archived=False
        )
        db.add(attempt)
        await db.commit()
            
        print(f"DEBUG: Neural ingestion successful for {file.filename}")
        return {"status": "ok", "message": "Neural patterns stabilized successfully."}
        
    except Exception as e:
        import traceback
        err_trace = traceback.format_exc()
        print(f"CRITICAL: Upload Error: {err_trace}")
        return JSONResponse(status_code=500, content={"error": f"Internal matrix error: {str(e)}"})

@router.post("/validate")
async def validate_quiz(file: UploadFile = File(...)):
    try:
        content = await file.read()
        metadata, questions = ExcelQuizService.parse_quiz_excel(content)
        return {
            "metadata": metadata,
            "questions_count": len(questions),
            "sample": questions[:5]
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Validation Error: {error_details}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "details": error_details}
        )

@router.post("/explain")
async def explain_question(data: dict):
    question_text = data.get("question")
    options = data.get("options", [])
    correct_answer = data.get("correct_answer")
    
    explanation = await ai_service.explain_question(question_text, options, correct_answer)
    return {"explanation": explanation}

@router.get("/{quiz_id}/mistakes")
async def get_quiz_mistakes(quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserAnswer, Question
    result = await db.execute(
        select(Question).join(UserAnswer).filter(UserAnswer.is_correct == False, Question.quiz_id == quiz_id).distinct()
    )
    mistakes = result.scalars().all()
    return mistakes

@router.post("/record_answer")
async def record_answer(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserAnswer, Question, QuizAttempt, UserQuestionMastery
    from app.modules.gamification.models import UserGamification, Badge
    from app.modules.gamification.interface import GamificationInterface
    from app.modules.stats.interface import StatsInterface
    from app.modules.notification.interface import NotificationInterface
    from sqlalchemy import and_, case

    user_id = int(request.cookies.get("user_id", 1)) # Default to 1 for demo
    is_correct = data.get("is_correct", False)
    time_spent = int(data.get("time_spent", 0))
    question_id = int(data.get("question_id"))
    selected_option_id = int(data.get("option_id")) if data.get("option_id") else None
    local_date = data.get("local_date")

    q_res = await db.execute(select(Question).filter(Question.id == question_id))
    question = q_res.scalar_one_or_none()
    
    goal_update_info = None
    mastery_update_info = None
    unlocked_badge_info = None

    if question:
        attempt_res = await db.execute(select(QuizAttempt).filter(QuizAttempt.user_id == user_id, QuizAttempt.quiz_id == question.quiz_id).order_by(QuizAttempt.id.desc()))
        attempt = attempt_res.scalar()
        if not attempt:
            attempt = QuizAttempt(user_id=user_id, quiz_id=question.quiz_id, mode="play")
            db.add(attempt)
            await db.flush()

        db_answer = UserAnswer(
            attempt_id=attempt.id,
            question_id=question_id,
            selected_option_id=selected_option_id,
            is_correct=is_correct,
            active_time=float(time_spent)
        )
        db.add(db_answer)
        await db.flush()

        # --- Spaced Repetition Mastery Levels ---
        mastery_res = await db.execute(
            select(UserQuestionMastery).where(
                UserQuestionMastery.user_id == user_id,
                UserQuestionMastery.question_id == question_id
            )
        )
        mastery = mastery_res.scalar_one_or_none()
        if not mastery:
            mastery = UserQuestionMastery(user_id=user_id, question_id=question_id, box_level=1, consecutive_correct=0)
            db.add(mastery)
            await db.flush()

        old_box_level = mastery.box_level
        if is_correct:
            mastery.consecutive_correct += 1
            if mastery.consecutive_correct >= 5:
                mastery.box_level = 5
            elif mastery.consecutive_correct >= 4:
                mastery.box_level = 4
            elif mastery.consecutive_correct >= 3:
                mastery.box_level = 3
            elif mastery.consecutive_correct >= 2:
                mastery.box_level = 2
        else:
            mastery.consecutive_correct = 0
            mastery.box_level = 1

        new_box_level = mastery.box_level
        mastery_update_info = {
            "old_level": old_box_level,
            "new_level": new_box_level,
            "consecutive_correct": mastery.consecutive_correct,
            "level_up": new_box_level > old_box_level
        }
        
        # --- Goal Progress Tracking Logic ---
        from app.modules.quiz.models import UserQuizGoal, UserDailyProgress
        goal_res = await db.execute(
            select(UserQuizGoal).filter(
                UserQuizGoal.user_id == user_id, 
                UserQuizGoal.quiz_id == question.quiz_id, 
                UserQuizGoal.status == "active"
            )
        )
        goal = goal_res.scalar_one_or_none()
        if goal:
            from datetime import datetime, date, timedelta
            today_str = local_date
            if not today_str:
                today_str = datetime.utcnow().strftime("%Y-%m-%d")
            
            prog_res = await db.execute(
                select(UserDailyProgress).filter(
                    UserDailyProgress.goal_id == goal.id,
                    UserDailyProgress.date == today_str
                )
            )
            progress = prog_res.scalar_one_or_none()
            if not progress:
                progress = UserDailyProgress(
                    goal_id=goal.id,
                    date=today_str,
                    count_done=0,
                    is_target_met=False
                )
                db.add(progress)
                await db.flush()
            # Only count toward goal if this is a BRAND NEW question (never answered before by this user)
            prior_answer_res = await db.execute(
                select(func.count(UserAnswer.id)).where(
                    UserAnswer.question_id == question_id,
                    UserAnswer.attempt_id.in_(
                        select(QuizAttempt.id).where(
                            QuizAttempt.user_id == user_id,
                            QuizAttempt.quiz_id == question.quiz_id
                        )
                    ),
                    UserAnswer.id != db_answer.id  # Exclude the answer we just inserted
                )
            )
            prior_count = prior_answer_res.scalar() or 0
            is_new_question = (prior_count == 0)
            
            if is_new_question:
                progress.count_done += 1
            just_completed = False
            bonus_xp = 0
            
            if progress.count_done >= goal.daily_target and not progress.is_target_met:
                progress.is_target_met = True
                just_completed = True
                
                try:
                    today_date = date.fromisoformat(today_str)
                except Exception:
                    today_date = datetime.utcnow().date()
                
                yesterday_str = (today_date - timedelta(days=1)).strftime("%Y-%m-%d")
                
                if goal.last_completed_date == yesterday_str:
                    goal.streak_count += 1
                elif goal.last_completed_date == today_str:
                    pass
                else:
                    goal.streak_count = 1
                
                goal.last_completed_date = today_str
                bonus_xp = 50

            remaining = max(0, goal.daily_target - progress.count_done)
            if just_completed:
                msg = f"DAILY GOAL REACHED! 🎉 You're on a {goal.streak_count}-day streak & earned +50 Discipline XP! 💪"
            elif progress.is_target_met:
                msg = f"Limitless Learning! You are pushing limits today with {progress.count_done} questions! 🔥"
            elif remaining == 1:
                msg = "Outstanding! Just 1 question left to complete your daily goal! 🚀"
            else:
                msg = f"Excellent! You've done {progress.count_done}/{goal.daily_target} new questions today. Just {remaining} more to hit your goal, keep going! ⚡"
            
            # Only send goal toast update if this was a new question or target is already met (limitless mode)
            if is_new_question or progress.is_target_met:
                goal_update_info = {
                    "goal_id": goal.id,
                    "daily_target": goal.daily_target,
                    "done_today": progress.count_done,
                    "is_target_met": progress.is_target_met,
                    "just_completed": just_completed,
                    "streak_count": goal.streak_count,
                    "remaining_today": remaining,
                    "bonus_xp": bonus_xp,
                    "motivational_message": msg,
                    "is_new_question": is_new_question
                }

        await db.commit()

    # --- Gamification Logic & Achievements Check ---
    xp_gain = 10 if is_correct else 2
    gamify_res = await GamificationInterface.add_xp(db, user_id, xp_gain)
    has_leveled_up = gamify_res["level_up"]
    current_level = gamify_res["current_level"]

    if goal_update_info and goal_update_info["bonus_xp"] > 0:
        bonus_res = await GamificationInterface.add_xp(db, user_id, goal_update_info["bonus_xp"])
        if bonus_res["level_up"]:
            has_leveled_up = True
        current_level = bonus_res["current_level"]

    if has_leveled_up:
        await NotificationInterface.send(
            db, user_id, 
            "LEVEL UP! 🚀", 
            f"Congratulations! You reached level {current_level}!",
            "level_up"
        )

    # --- Achievements Check ---
    user_gamify_res = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
    user_gamify = user_gamify_res.scalar_one_or_none()
    if not user_gamify:
        user_gamify = UserGamification(user_id=user_id, xp=0, level=1, badges=[])
        db.add(user_gamify)
        await db.flush()

    already_earned = set(user_gamify.badges or [])
    badges_res = await db.execute(select(Badge))
    all_badges = badges_res.scalars().all()

    for badge in all_badges:
        if badge.id in already_earned:
            continue
        
        should_unlock = False
        if badge.id == "first_steps":
            ans_count_res = await db.execute(
                select(func.count(UserAnswer.id)).join(QuizAttempt).where(QuizAttempt.user_id == user_id)
            )
            if (ans_count_res.scalar() or 0) >= 1:
                should_unlock = True
                
        elif badge.id == "streak_starter":
            if user_gamify.streak_count >= 3 or (goal_update_info and goal_update_info["streak_count"] >= 3):
                should_unlock = True
                
        elif badge.id == "streak_legend":
            if user_gamify.streak_count >= 7 or (goal_update_info and goal_update_info["streak_count"] >= 7):
                should_unlock = True
                
        elif badge.id == "perfect_score":
            perf_attempt_res = await db.execute(
                select(QuizAttempt.id)
                .join(UserAnswer)
                .where(QuizAttempt.user_id == user_id)
                .group_by(QuizAttempt.id)
                .having(
                    and_(
                        func.count(UserAnswer.id) >= 5,
                        func.sum(case((UserAnswer.is_correct == True, 1), else_=0)) == func.count(UserAnswer.id)
                    )
                )
            )
            if perf_attempt_res.first():
                should_unlock = True
                
        elif badge.id == "speed_demon":
            if time_spent > 0 and time_spent <= 5 and is_correct:
                fast_correct_res = await db.execute(
                    select(func.count(UserAnswer.id))
                    .join(QuizAttempt)
                    .where(
                        QuizAttempt.user_id == user_id,
                        UserAnswer.is_correct == True,
                        UserAnswer.active_time <= 5.0,
                        UserAnswer.active_time > 0.0
                    )
                )
                if (fast_correct_res.scalar() or 0) >= 5:
                    should_unlock = True
                    
        elif badge.id == "goal_crusher":
            goal_completed_res = await db.execute(
                select(func.count(UserDailyProgress.id)).where(
                    UserDailyProgress.goal_id.in_(
                        select(UserQuizGoal.id).where(UserQuizGoal.user_id == user_id)
                    ),
                    UserDailyProgress.is_target_met == True
                )
            )
            if (goal_completed_res.scalar() or 0) >= 3:
                should_unlock = True
                
        elif badge.id == "card_master":
            mastered_cards_res = await db.execute(
                select(func.count(UserQuestionMastery.id)).where(
                    UserQuestionMastery.user_id == user_id,
                    UserQuestionMastery.box_level == 5
                )
            )
            if (mastered_cards_res.scalar() or 0) >= 10:
                should_unlock = True
        
        if should_unlock:
            new_badges = list(user_gamify.badges or [])
            new_badges.append(badge.id)
            user_gamify.badges = new_badges
            
            xp_reward = 150
            if badge.id == "first_steps": xp_reward = 100
            elif badge.id == "streak_starter": xp_reward = 250
            elif badge.id == "streak_legend": xp_reward = 500
            elif badge.id == "perfect_score": xp_reward = 300
            elif badge.id == "speed_demon": xp_reward = 200
            elif badge.id == "goal_crusher": xp_reward = 400
            elif badge.id == "card_master": xp_reward = 500
            
            gamify_res2 = await GamificationInterface.add_xp(db, user_id, xp_reward)
            if gamify_res2["level_up"]:
                has_leveled_up = True
                current_level = gamify_res2["current_level"]
            
            await NotificationInterface.send(
                db, user_id,
                f"🏆 ACHIEVEMENT UNLOCKED: {badge.name}!",
                f"You unlocked the badge '{badge.name}' and earned +{xp_reward} XP! {badge.description}",
                "achievement"
            )
            
            unlocked_badge_info = {
                "id": badge.id,
                "name": badge.name,
                "description": badge.description,
                "icon": badge.icon,
                "xp_reward": xp_reward
            }
            break

    # --- Stats Logic ---
    await StatsInterface.record_activity(db, user_id, is_correct, time_spent)
    await db.commit()

    return {
        "status": "ok", 
        "xp_gained": xp_gain + (goal_update_info["bonus_xp"] if goal_update_info else 0) + (unlocked_badge_info["xp_reward"] if unlocked_badge_info else 0), 
        "level_up": has_leveled_up,
        "goal_update": goal_update_info,
        "mastery_update": mastery_update_info,
        "unlocked_badge": unlocked_badge_info
    }

@router.get("/stats")
async def get_quiz_stats(db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserAnswer
    
    # 1. Overall accuracy
    total_res = await db.execute(select(func.count(UserAnswer.id)))
    total = total_res.scalar()
    
    correct_res = await db.execute(select(func.count(UserAnswer.id)).filter(UserAnswer.is_correct == True))
    correct = correct_res.scalar()
    
    accuracy = (correct / total * 100) if total > 0 else 0
    
    # 2. Activity by day (last 7 days)
    activity_res = await db.execute(
        select(func.date(UserAnswer.created_at), func.count(UserAnswer.id))
        .group_by(func.date(UserAnswer.created_at))
        .order_by(func.date(UserAnswer.created_at))
        .limit(7)
    )
    activity = activity_res.all()
    
    return {
        "overall_accuracy": accuracy,
        "total_answers": total,
        "correct_answers": correct,
        "activity_data": activity
    }

@router.get("/{quiz_id}/data")
async def get_quiz_data(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    from app.modules.quiz.models import QuizCollaborator
    
    quiz = await QuizService.get_quiz_by_id(db, quiz_id)
    if not quiz: return JSONResponse(status_code=404, content={"error": "Quiz not found"})
    
    from app.modules.quiz.models import Question
    q_count_res = await db.execute(select(func.count(Question.id)).where(Question.quiz_id == quiz_id))
    q_count = q_count_res.scalar()
    
    # Check if user is collaborator
    collab_res = await db.execute(select(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id, QuizCollaborator.user_id == user_id))
    is_collaborator = collab_res.scalar() is not None
    
    return {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "instruction": quiz.instruction,
        "ai_prompt": quiz.ai_prompt,
        "creator_id": quiz.creator_id,
        "is_collaborator": is_collaborator,
        "questions_count": q_count,
        "tags": [t.name for t in quiz.tags]
    }

@router.get("/{quiz_id}/play-data")
async def get_quiz_play_data(request: Request, quiz_id: int, mode: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    if mode in ("mcq", "typing", "listening"):
        quiz = await QuizService.get_quiz_by_id(db, quiz_id)
    else:
        quiz = await QuizService.get_quiz_with_stats(db, quiz_id, user_id=user_id)
    if not quiz: return JSONResponse(status_code=404, content={"error": "Quiz not found"})
    
    from app.modules.gamification.interface import GamificationInterface
    user_stats = await GamificationInterface.get_user_stats(db, user_id)
    
    from app.modules.quiz.models import QuizCollaborator
    collab_res = await db.execute(select(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id, QuizCollaborator.user_id == user_id))
    is_collaborator = collab_res.scalar() is not None
    
    from app.modules.quiz.models import UserQuestionMastery
    mastery_stmt = select(UserQuestionMastery.question_id, UserQuestionMastery.box_level, UserQuestionMastery.is_ignored).where(
        UserQuestionMastery.user_id == user_id,
        UserQuestionMastery.question_id.in_([q.id for q in quiz.questions])
    )
    mastery_res = await db.execute(mastery_stmt)
    mastery_map = {row[0]: {"box_level": row[1], "is_ignored": row[2]} for row in mastery_res.all()}
    
    return {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "ai_prompt": quiz.ai_prompt,
        "instruction": quiz.instruction,
        "category_id": quiz.category_id,
        "creator_id": quiz.creator_id,
        "is_collaborator": is_collaborator,
        "user_total_xp": user_stats.get("xp", 0),
        "questions": [
            {
                "id": q.id,
                "content": q.content,
                "explanation": q.explanation,
                "ai_explanation": q.ai_explanation,
                "stats": getattr(q, 'stats', None),
                "box_level": mastery_map.get(q.id, {}).get("box_level", 1),
                "is_ignored": mastery_map.get(q.id, {}).get("is_ignored", False),
                "options": [
                    {"id": o.id, "content": o.content, "is_correct": o.is_correct}
                    for o in q.options
                ]
            } for q in quiz.questions
        ]
    }

@router.get("/{quiz_id}/session")
async def get_quiz_session(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizSession
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(select(QuizSession).filter(QuizSession.quiz_id == quiz_id, QuizSession.user_id == user_id))
    session = result.scalar_one_or_none()
    if not session: return None
    return {
        "mode": session.mode,
        "current_index": session.current_index,
        "state": json.loads(session.state_json) if session.state_json else {}
    }

@router.post("/{quiz_id}/session")
async def save_quiz_session(request: Request, quiz_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizSession
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(select(QuizSession).filter(QuizSession.quiz_id == quiz_id, QuizSession.user_id == user_id))
    session = result.scalar_one_or_none()
    if not session:
        session = QuizSession(quiz_id=quiz_id, user_id=user_id)
        db.add(session)
    
    session.mode = data.get("mode")
    session.current_index = data.get("current_index", 0)
    session.state_json = json.dumps(data.get("state", {}))
    await db.commit()
    return {"status": "ok"}

@router.delete("/{quiz_id}/session")
async def reset_quiz_session(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizSession
    user_id = int(request.cookies.get("user_id", 1))
    await db.execute(delete(QuizSession).where(QuizSession.quiz_id == quiz_id, QuizSession.user_id == user_id))
    await db.commit()
    return {"status": "ok"}

async def _generate_ai_task(quiz_id: int, question_id: int, prompt_template: Optional[str] = None):
    from app.core.db import AsyncSession, engine
    from app.modules.quiz.models import Question, Quiz
    from app.modules.ai.services.gemini_service import GeminiService
    from sqlalchemy.orm import selectinload
    
    async with AsyncSession(engine) as db:
        result = await db.execute(
            select(Question)
            .filter(Question.id == question_id)
            .options(selectinload(Question.options))
        )
        q = result.scalar_one_or_none()
        if not q: return
        
        gemini = await GeminiService.from_db(db)
        if not gemini.client:
            q.ai_explanation = "AI Service not configured."
            await db.commit()
            return

        try:
            if prompt_template:
                # Same replacement logic as before
                options_text = "\n".join([f"{chr(65+i)}. {o.content}" for i, o in enumerate(q.options)])
                correct_opt = next((o for o in q.options if o.is_correct), None)
                correct_answer_text = "Unknown"
                if correct_opt:
                    idx = q.options.index(correct_opt)
                    correct_answer_text = f"{chr(65+idx)}. {correct_opt.content}"
                
                # Fetch quiz info for template
                quiz_res = await db.execute(select(Quiz).filter(Quiz.id == quiz_id))
                quiz = quiz_res.scalar_one_or_none()
                
                prompt = prompt_template \
                    .replace("{{question}}", q.content) \
                    .replace("{{options}}", options_text) \
                    .replace("{{correct_answer}}", correct_answer_text) \
                    .replace("{{global_instruction}}", quiz.instruction if quiz else "") \
                    .replace("{{quiz_title}}", quiz.title if quiz else "") \
                    .replace("{{quiz_description}}", quiz.description if quiz else "")
                
                for i in range(4):
                    val = q.options[i].content if len(q.options) > i else ""
                    prompt = prompt.replace(f"{{{{option_{chr(97+i)}}}}}", val)

                response = await gemini.client.aio.models.generate_content(
                    model=gemini.model_id,
                    contents=prompt
                )
                ai_response = response.text
                
                # Strip markdown wrappers if present
                ai_response = ai_response.strip()
                if ai_response.startswith("```markdown"):
                    ai_response = ai_response[len("```markdown"):].strip()
                elif ai_response.startswith("```"):
                    ai_response = ai_response[len("```"):].strip()
                
                if ai_response.endswith("```"):
                    ai_response = ai_response[:-3].strip()
                
                # Strip backticks around ruby tags
                ai_response = re.sub(r'`\s*(<ruby>[\s\S]*?<\/ruby>)\s*`', r'\1', ai_response)
                    
            else:
                options_list = [o.content for o in q.options]
                correct_opt = next((o.content for o in q.options if o.is_correct), None)
                correct_text = correct_opt.content if correct_opt else "Unknown"
                ai_response = await gemini.generate_explanation(q.content, options_list, correct_text)
                
                # Also strip wrappers for default generation
                ai_response = ai_response.strip()
                if ai_response.startswith("```markdown"):
                    ai_response = ai_response[len("```markdown"):].strip()
                elif ai_response.startswith("```"):
                    ai_response = ai_response[len("```"):].strip()
                if ai_response.endswith("```"):
                    ai_response = ai_response[:-3].strip()
                
                # Strip backticks around ruby tags
                ai_response = re.sub(r'`\s*(<ruby>[\s\S]*?<\/ruby>)\s*`', r'\1', ai_response)
            
            q.ai_explanation = ai_response
            await db.commit()
        except Exception as e:
            q.ai_explanation = f"AI Error: {str(e)}"
            await db.commit()

@router.post("/{quiz_id}/ask-ai")
async def ask_ai(quiz_id: int, payload: dict, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    question_id = payload.get("question_id")
    from app.modules.quiz.models import Question, Quiz
    from app.modules.admin.interface import AdminInterface
    
    # Check if AI is enabled
    ai_config = await AdminInterface.get_ai_config(db)
    if not ai_config.get("enabled"):
        return {"error": "AI Analysis is disabled."}

    result = await db.execute(select(Question).filter(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q: return {"error": "Not found"}
    
    # If explanation already exists and no manual override, just return it
    if q.ai_explanation and "ai_explanation" not in payload:
        return {"ai_explanation": q.ai_explanation}

    # Manual explanation override (saving)
    if "ai_explanation" in payload:
        val = payload["ai_explanation"]
        if isinstance(val, str):
            val = val.strip()
        q.ai_explanation = val if val else None
        await db.commit()
        return {"ai_explanation": q.ai_explanation}
    
    # Background generation
    quiz_res = await db.execute(select(Quiz).filter(Quiz.id == quiz_id))
    quiz = quiz_res.scalar_one_or_none()
    
    background_tasks.add_task(_generate_ai_task, quiz_id, question_id, quiz.ai_prompt if quiz else None)
    
    return {"status": "processing", "message": "AI analysis started in background."}

@router.delete("/{quiz_id}/session")
async def delete_quiz_session(quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizSession
    await db.execute(delete(QuizSession).where(QuizSession.quiz_id == quiz_id))
    await db.commit()
    return {"status": "ok"}

@router.get("/question/{question_id}/note")
async def get_question_note(request: Request, question_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserQuestionNote
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(
        select(UserQuestionNote).where(UserQuestionNote.user_id == user_id, UserQuestionNote.question_id == question_id)
    )
    note = result.scalar_one_or_none()
    return {"content": note.content if note else ""}

@router.post("/question/{question_id}/note")
async def save_question_note(request: Request, question_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserQuestionNote
    user_id = int(request.cookies.get("user_id", 1))
    content = data.get("content", "")
    
    result = await db.execute(
        select(UserQuestionNote).where(UserQuestionNote.user_id == user_id, UserQuestionNote.question_id == question_id)
    )
    note = result.scalar_one_or_none()
    
    if note:
        note.content = content
    else:
        note = UserQuestionNote(user_id=user_id, question_id=question_id, content=content)
        db.add(note)
    
    await db.commit()
    return {"status": "ok"}

@router.post("/question/{question_id}/ignore")
async def toggle_question_ignore(request: Request, question_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserQuestionMastery
    user_id = int(request.cookies.get("user_id", 1))
    is_ignored = data.get("is_ignored", True)
    
    result = await db.execute(
        select(UserQuestionMastery).where(UserQuestionMastery.user_id == user_id, UserQuestionMastery.question_id == question_id)
    )
    mastery = result.scalar_one_or_none()
    
    if mastery:
        mastery.is_ignored = is_ignored
    else:
        mastery = UserQuestionMastery(user_id=user_id, question_id=question_id, is_ignored=is_ignored)
        db.add(mastery)
        
    await db.commit()
    return {"status": "ok", "is_ignored": is_ignored}

@router.get("/{quiz_id}/notes")
async def get_quiz_notes(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserQuestionNote, Question
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(
        select(UserQuestionNote).join(Question).where(UserQuestionNote.user_id == user_id, Question.quiz_id == quiz_id)
    )
    notes = result.scalars().all()
    return {n.question_id: n.content for n in notes}

@router.get("/{quiz_id}/export")
async def export_quiz(quiz_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    quiz = await QuizService.get_quiz_by_id(db, quiz_id)
    if not quiz:
        return JSONResponse(status_code=404, content={"error": "Quiz not found"})
        
    from app.modules.quiz.models import Question
    q_stmt = select(Question).where(Question.quiz_id == quiz_id).options(selectinload(Question.options))
    res = await db.execute(q_stmt)
    questions = res.scalars().all()
    
    category_name = quiz.category.name if quiz.category else "General"
    tags = [t.name for t in quiz.tags]
    
    excel_bytes = ExcelQuizService.export_quiz_to_excel(
        quiz_title=quiz.title,
        quiz_description=quiz.description,
        category_name=category_name,
        tags=tags,
        questions=questions
    )
    
    from fastapi.responses import Response
    import urllib.parse
    encoded_filename = urllib.parse.quote(f"{quiz.title}.xlsx")
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
        }
    )

@router.post("/{quiz_id}/import-update")
async def import_update_quiz(request: Request, quiz_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    try:
        user_id = int(request.cookies.get("user_id", 1))
        quiz = await QuizService.get_quiz_by_id(db, quiz_id)
        if not quiz:
            return JSONResponse(status_code=404, content={"error": "Quiz not found"})
            
        from app.modules.quiz.models import QuizCollaborator
        is_owner = quiz.creator_id == user_id
        collab_res = await db.execute(select(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id, QuizCollaborator.user_id == user_id))
        is_collaborator = collab_res.scalar() is not None
        
        if not (is_owner or is_collaborator or user_id == 1):
            return JSONResponse(status_code=403, content={"error": "No permission to update this quiz"})
            
        content = await file.read()
        import asyncio
        metadata, questions = await asyncio.to_thread(ExcelQuizService.parse_quiz_excel, content)
        
        if not questions:
            return JSONResponse(status_code=400, content={"error": "No valid questions found in Excel file."})
            
        quiz.title = metadata.get("title", quiz.title)
        quiz.description = metadata.get("description", quiz.description)
        if metadata.get("time_limit") is not None:
            quiz.time_limit = metadata["time_limit"]
            
        category_name = metadata.get("category")
        if category_name:
            from app.modules.quiz.models import Category
            cat_res = await db.execute(select(Category).filter(Category.name == category_name))
            db_cat = cat_res.scalar_one_or_none()
            if not db_cat:
                db_cat = Category(name=category_name, description=f"Imported from {file.filename}")
                db.add(db_cat)
                await db.flush()
            quiz.category_id = db_cat.id
            
        if metadata.get("tags"):
            await QuizService.set_quiz_tags(db, quiz_id, metadata["tags"])
            
        from app.modules.quiz.models import Question, Option
        existing_q_res = await db.execute(
            select(Question).filter(Question.quiz_id == quiz_id).options(selectinload(Question.options))
        )
        existing_q_map = {q.id: q for q in existing_q_res.scalars().all()}
        
        for q_data in questions:
            q_id = q_data.get("id")
            
            if q_id and q_id in existing_q_map:
                db_q = existing_q_map[q_id]
                db_q.content = q_data["content"]
                db_q.explanation = q_data["explanation"]
                db_q.ai_explanation = q_data.get("ai_explanation")
                db_q.image = q_data.get("image")
                db_q.audio = q_data.get("audio")
                db_q.question_type = q_data.get("question_type", db_q.question_type)
                db_q.others = q_data.get("others")
                
                old_options = db_q.options
                new_options = q_data.get("options", [])
                
                max_len = max(len(old_options), len(new_options))
                for i in range(max_len):
                    if i < len(old_options) and i < len(new_options):
                        old_options[i].content = new_options[i]["content"]
                        old_options[i].is_correct = new_options[i]["is_correct"]
                    elif i >= len(old_options):
                        new_opt = Option(
                            question_id=db_q.id,
                            content=new_options[i]["content"],
                            is_correct=new_options[i]["is_correct"]
                        )
                        db.add(new_opt)
                    elif i >= len(new_options):
                        await db.delete(old_options[i])
            else:
                db_q = Question(
                    quiz_id=quiz_id,
                    content=q_data["content"],
                    explanation=q_data["explanation"],
                    ai_explanation=q_data.get("ai_explanation"),
                    image=q_data.get("image"),
                    audio=q_data.get("audio"),
                    question_type=q_data.get("question_type", "single_choice"),
                    others=q_data.get("others")
                )
                db.add(db_q)
                await db.flush()
                
                for opt_data in q_data.get("options", []):
                    new_opt = Option(
                        question_id=db_q.id,
                        content=opt_data["content"],
                        is_correct=opt_data["is_correct"]
                    )
                    db.add(new_opt)
                    
        await db.commit()
        return {"status": "ok", "message": "Quiz updated successfully."}
        
    except Exception as e:
        import traceback
        print(f"CRITICAL: Excel update error: {traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/{quiz_id}/questions")
async def get_quiz_questions(request: Request, quiz_id: int, page: int = 1, size: int = 50, search: str = "", db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    from app.modules.quiz.models import Question, Option
    
    query = select(Question).where(Question.quiz_id == quiz_id).options(selectinload(Question.options))
    if search:
        query = query.filter(Question.content.ilike(f"%{search}%"))
    
    # Count total for pagination
    count_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_res.scalar()
    
    # Get paginated results
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    qs = result.scalars().all()
    
    # Fetch stats for these questions
    from app.modules.quiz.models import UserAnswer, UserQuestionMastery
    q_ids = [q.id for q in qs]
    stats_query = select(
        UserAnswer.question_id,
        func.count(UserAnswer.id).label("total"),
        func.sum(func.cast(UserAnswer.is_correct, Integer)).label("correct")
    ).where(UserAnswer.question_id.in_(q_ids)).group_by(UserAnswer.question_id)
    stats_res = await db.execute(stats_query)
    stats_map = {r.question_id: {"total": r.total, "correct": r.correct, "wrong": r.total - r.correct} for r in stats_res}
    
    mastery_stmt = select(UserQuestionMastery.question_id, UserQuestionMastery.is_ignored).where(
        UserQuestionMastery.user_id == user_id,
        UserQuestionMastery.question_id.in_(q_ids)
    )
    mastery_res = await db.execute(mastery_stmt)
    ignored_map = {row[0]: row[1] for row in mastery_res.all()}
    
    return {
        "questions": [
            {
                "id": q.id,
                "orig_index": (page - 1) * size + i + 1,
                "content": q.content,
                "explanation": q.explanation,
                "ai_explanation": q.ai_explanation,
                "points": q.points,
                "image": q.image,
                "audio": q.audio,
                "stats": stats_map.get(q.id, {"total": 0, "correct": 0, "wrong": 0}),
                "is_ignored": ignored_map.get(q.id, False),
                "options": [
                    {
                        "id": o.id,
                        "content": o.content,
                        "is_correct": o.is_correct
                    } for o in q.options
                ]
            } for i, q in enumerate(qs)
        ],
        "total": total,
        "page": page,
        "size": size
    }

@router.post("/{quiz_id}/enroll")
async def enroll_quiz(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizAttempt
    user_id = int(request.cookies.get("user_id", 1))
    
    # Check if already enrolled
    result = await db.execute(
        select(QuizAttempt).where(QuizAttempt.user_id == user_id, QuizAttempt.quiz_id == quiz_id)
    )
    existing = result.scalar_one_or_none()
    
    if not existing:
        attempt = QuizAttempt(
            user_id=user_id,
            quiz_id=quiz_id,
            mode="sequential",
            score=0,
            total_questions=0,
            is_archived=False
        )
        db.add(attempt)
    else:
        existing.is_archived = False
    
    await db.commit()
    return {"status": "ok"}

@router.post("/{quiz_id}/archive")
async def archive_quiz(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizAttempt
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(select(QuizAttempt).where(QuizAttempt.user_id == user_id, QuizAttempt.quiz_id == quiz_id))
    attempt = result.scalar_one_or_none()
    if attempt:
        attempt.is_archived = not attempt.is_archived
        await db.commit()
    return {"status": "ok"}

@router.delete("/{quiz_id}")
async def delete_quiz(quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import Quiz
    await db.execute(delete(Quiz).where(Quiz.id == quiz_id))
    await db.commit()
    return {"status": "ok"}

@router.patch("/{quiz_id}")
async def update_quiz(request: Request, quiz_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    from app.modules.quiz.models import Quiz, QuizCollaborator
    
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz: return JSONResponse(status_code=404, content={"error": "Quiz not found"})
    
    # Permission Check: Creator, Admin, or Collaborator
    from app.modules.auth.models import User as UserDB
    user_res = await db.execute(select(UserDB).where(UserDB.id == user_id))
    user_obj = user_res.scalar_one_or_none()
    is_admin = user_obj and user_obj.role == "admin"
    
    if quiz.creator_id != user_id and user_id != 1 and not is_admin:
        collab_res = await db.execute(select(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id, QuizCollaborator.user_id == user_id))
        if not collab_res.scalar():
            return JSONResponse(status_code=403, content={"error": "Permission denied"})
    
    if "title" in data: quiz.title = data["title"]
    if "description" in data: quiz.description = data["description"]
    if "category_id" in data: quiz.category_id = data["category_id"]
    if "ai_prompt" in data: quiz.ai_prompt = data["ai_prompt"]
    if "instruction" in data: quiz.instruction = data["instruction"]
    
    if "tags" in data:
        await QuizService.set_quiz_tags(db, quiz_id, data["tags"])
    
    await db.commit()
    return {"status": "ok"}

# --- Collaborator Endpoints ---

@router.get("/users/search")
async def search_users(q: str, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.models import User
    result = await db.execute(
        select(User).filter(or_(User.username.ilike(f"%{q}%"), User.full_name.ilike(f"%{q}%"))).limit(10)
    )
    users = result.scalars().all()
    return [{"id": u.id, "username": u.username, "full_name": u.full_name} for u in users]

@router.get("/{quiz_id}/collaborators")
async def get_collaborators(quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizCollaborator
    from app.modules.auth.models import User
    result = await db.execute(
        select(User).join(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id)
    )
    collabs = result.scalars().all()
    return [{"id": u.id, "username": u.username, "full_name": u.full_name} for u in collabs]

@router.post("/{quiz_id}/collaborators")
async def add_collaborator(request: Request, quiz_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    target_user_id = data.get("user_id")
    
    from app.modules.quiz.models import Quiz, QuizCollaborator
    quiz_res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = quiz_res.scalar_one_or_none()
    
    if not quiz or (quiz.creator_id != user_id and user_id != 1):
        return JSONResponse(status_code=403, content={"error": "Only creator can add collaborators"})
        
    existing = await db.execute(select(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id, QuizCollaborator.user_id == target_user_id))
    if existing.scalar():
        return {"status": "ok", "message": "Already a collaborator"}
        
    new_collab = QuizCollaborator(quiz_id=quiz_id, user_id=target_user_id)
    db.add(new_collab)
    await db.commit()
    return {"status": "ok"}

@router.delete("/{quiz_id}/collaborators/{collab_user_id}")
async def remove_collaborator(request: Request, quiz_id: int, collab_user_id: int, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    
    from app.modules.quiz.models import Quiz, QuizCollaborator
    quiz_res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = quiz_res.scalar_one_or_none()
    
    if not quiz or (quiz.creator_id != user_id and user_id != 1):
        return JSONResponse(status_code=403, content={"error": "Only creator can remove collaborators"})
        
    await db.execute(delete(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id, QuizCollaborator.user_id == collab_user_id))
    await db.commit()
    return {"status": "ok"}

@router.post("/{quiz_id}/transfer-ownership")
async def transfer_ownership(request: Request, quiz_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    target_user_id = data.get("user_id")
    
    from app.modules.quiz.models import Quiz
    quiz_res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = quiz_res.scalar_one_or_none()
    
    if not quiz or (quiz.creator_id != user_id and user_id != 1):
        return JSONResponse(status_code=403, content={"error": "Only current creator can transfer ownership"})
        
    quiz.creator_id = target_user_id
    await db.commit()
    return {"status": "ok"}

@router.patch("/question/{question_id}")
async def update_question(question_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import Question, Option
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question: return JSONResponse(status_code=404, content={"error": "Question not found"})
    
    if "content" in data: question.content = data["content"]
    if "explanation" in data: question.explanation = data["explanation"]
    if "ai_explanation" in data: question.ai_explanation = data["ai_explanation"]
    if "points" in data: question.points = data["points"]
    if "image" in data: question.image = data["image"]
    if "audio" in data: question.audio = data["audio"]
    
    # Update options if provided
    if "options" in data:
        for opt_data in data["options"]:
            opt_id = opt_data.get("id")
            if opt_id:
                opt_res = await db.execute(select(Option).where(Option.id == opt_id, Option.question_id == question_id))
                opt = opt_res.scalar_one_or_none()
                if opt:
                    if "content" in opt_data: opt.content = opt_data["content"]
                    if "is_correct" in opt_data: opt.is_correct = opt_data["is_correct"]
    
    await db.commit()
    return {"status": "ok"}

@router.delete("/question/{question_id}")
async def delete_question(question_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import Question
    await db.execute(delete(Question).where(Question.id == question_id))
    await db.commit()
    return {"status": "ok"}

@router.post("/goals")
async def create_or_update_goal(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserQuizGoal
    user_id = int(request.cookies.get("user_id", 1))
    quiz_id = int(data.get("quiz_id"))
    daily_target = int(data.get("daily_target", 5))

    # Check if goal exists
    res = await db.execute(
        select(UserQuizGoal).filter(UserQuizGoal.user_id == user_id, UserQuizGoal.quiz_id == quiz_id)
    )
    goal = res.scalar_one_or_none()
    if goal:
        goal.daily_target = daily_target
        goal.status = "active"
    else:
        goal = UserQuizGoal(
            user_id=user_id,
            quiz_id=quiz_id,
            daily_target=daily_target,
            status="active"
        )
        db.add(goal)
    
    await db.commit()
    return {"status": "ok", "goal_id": goal.id, "daily_target": goal.daily_target}

@router.get("/goals/active")
async def get_active_goals(request: Request, local_date: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserQuizGoal, UserDailyProgress, Quiz, Question, UserAnswer, QuizAttempt
    from sqlalchemy.orm import joinedload
    import math
    from datetime import datetime
    
    user_id = int(request.cookies.get("user_id", 1))
    if not local_date:
        local_date = datetime.utcnow().strftime("%Y-%m-%d")

    # Fetch active goals with joinedload of Quiz to avoid N+1
    res = await db.execute(
        select(UserQuizGoal)
        .options(joinedload(UserQuizGoal.quiz))
        .filter(UserQuizGoal.user_id == user_id, UserQuizGoal.status == "active")
    )
    goals = res.scalars().all()

    if not goals:
        return []

    goal_ids = [goal.id for goal in goals]
    quiz_ids = [goal.quiz_id for goal in goals]

    # Bulk query daily progress
    prog_res = await db.execute(
        select(UserDailyProgress).filter(
            UserDailyProgress.goal_id.in_(goal_ids),
            UserDailyProgress.date == local_date
        )
    )
    progress_map = {p.goal_id: p for p in prog_res.scalars().all()}

    # Bulk query total questions count grouped by quiz_id
    q_count_res = await db.execute(
        select(Question.quiz_id, func.count(Question.id))
        .filter(Question.quiz_id.in_(quiz_ids))
        .group_by(Question.quiz_id)
    )
    q_count_map = {r[0]: r[1] for r in q_count_res.all()}

    # Bulk query learned count grouped by quiz_id
    learned_res = await db.execute(
        select(Question.quiz_id, func.count(func.distinct(Question.id)))
        .join(UserAnswer, UserAnswer.question_id == Question.id)
        .join(QuizAttempt, QuizAttempt.id == UserAnswer.attempt_id)
        .filter(Question.quiz_id.in_(quiz_ids), QuizAttempt.user_id == user_id)
        .group_by(Question.quiz_id)
    )
    learned_map = {r[0]: r[1] for r in learned_res.all()}

    goals_data = []
    for goal in goals:
        quiz = goal.quiz
        if not quiz:
            continue
            
        total_questions = q_count_map.get(goal.quiz_id, 0)
        total_learned = learned_map.get(goal.quiz_id, 0)
        
        progress = progress_map.get(goal.id)
        done_today = progress.count_done if progress else 0
        is_target_met = progress.is_target_met if progress else False
        
        remaining_qs = max(0, total_questions - total_learned)
        days_remaining_est = math.ceil(remaining_qs / goal.daily_target) if goal.daily_target > 0 else 0
        
        goals_data.append({
            "goal_id": goal.id,
            "quiz_id": goal.quiz_id,
            "quiz_title": quiz.title,
            "cover_image": quiz.cover_image,
            "total_questions": total_questions,
            "total_learned": total_learned,
            "daily_target": goal.daily_target,
            "done_today": done_today,
            "is_target_met": is_target_met,
            "streak_count": goal.streak_count,
            "days_remaining_est": days_remaining_est
        })
        
    return goals_data

@router.post("/goals/remove")
async def remove_goal(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserQuizGoal
    user_id = int(request.cookies.get("user_id", 1))
    quiz_id = int(data.get("quiz_id"))
    
    await db.execute(
        delete(UserQuizGoal).where(UserQuizGoal.user_id == user_id, UserQuizGoal.quiz_id == quiz_id)
    )
    await db.commit()
    return {"status": "ok"}

@router.get("/gamification/badges")
async def get_user_badges(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.gamification.models import UserGamification, Badge
    from app.modules.quiz.models import UserAnswer, QuizAttempt, UserQuizGoal, UserDailyProgress, UserQuestionMastery
    from app.modules.auth.services.auth_service import AuthService
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Get user gamification model
    user_gamify_res = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
    user_gamify = user_gamify_res.scalar_one_or_none()
    unlocked_badge_ids = set(user_gamify.badges or []) if user_gamify else set()
    
    # Get all badges
    badges_res = await db.execute(select(Badge))
    all_badges = badges_res.scalars().all()
    
    badges_list = []
    for badge in all_badges:
        is_unlocked = badge.id in unlocked_badge_ids
        progress = 0
        if is_unlocked:
            progress = 100
        else:
            if badge.id == "first_steps":
                ans_res = await db.execute(
                    select(func.count(UserAnswer.id)).join(QuizAttempt).where(QuizAttempt.user_id == user_id)
                )
                cnt = ans_res.scalar() or 0
                progress = min(100, int((cnt / 1) * 100))
            elif badge.id == "streak_starter":
                streak = user_gamify.streak_count if user_gamify else 0
                progress = min(100, int((streak / 3) * 100))
            elif badge.id == "streak_legend":
                streak = user_gamify.streak_count if user_gamify else 0
                progress = min(100, int((streak / 7) * 100))
            elif badge.id == "perfect_score":
                progress = 0
            elif badge.id == "speed_demon":
                fast_res = await db.execute(
                    select(func.count(UserAnswer.id))
                    .join(QuizAttempt)
                    .where(
                        QuizAttempt.user_id == user_id,
                        UserAnswer.is_correct == True,
                        UserAnswer.active_time <= 5.0,
                        UserAnswer.active_time > 0.0
                    )
                )
                cnt = fast_res.scalar() or 0
                progress = min(100, int((cnt / 5) * 100))
            elif badge.id == "goal_crusher":
                goals_res = await db.execute(
                    select(func.count(UserDailyProgress.id)).where(
                        UserDailyProgress.goal_id.in_(
                            select(UserQuizGoal.id).where(UserQuizGoal.user_id == user_id)
                        ),
                        UserDailyProgress.is_target_met == True
                    )
                )
                cnt = goals_res.scalar() or 0
                progress = min(100, int((cnt / 3) * 100))
            elif badge.id == "card_master":
                mastered_res = await db.execute(
                    select(func.count(UserQuestionMastery.id)).where(
                        UserQuestionMastery.user_id == user_id,
                        UserQuestionMastery.box_level == 5
                    )
                )
                cnt = mastered_res.scalar() or 0
                progress = min(100, int((cnt / 10) * 100))

        badges_list.append({
            "id": badge.id,
            "name": badge.name,
            "description": badge.description,
            "icon": badge.icon,
            "criteria_type": badge.criteria_type,
            "criteria_value": badge.criteria_value,
            "is_unlocked": is_unlocked,
            "progress": progress
        })
        
    return {
        "badges": badges_list,
        "total_unlocked": len(unlocked_badge_ids),
        "total_count": len(all_badges)
    }

@router.get("/goals/global")
async def get_global_goals(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserGlobalGoal
    from app.modules.stats.models import UserDailyStats
    from app.modules.auth.services.auth_service import AuthService
    from fastapi import HTTPException
    from datetime import datetime
    
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = user.id
    
    # Get or create user global goals
    res = await db.execute(select(UserGlobalGoal).filter(UserGlobalGoal.user_id == user_id))
    goal = res.scalar_one_or_none()
    if not goal:
        goal = UserGlobalGoal(user_id=user_id, daily_time_target=20, daily_card_target=20, daily_new_card_target=10)
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
        
    # Get today's stats (time and cards studied)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    stats_res = await db.execute(
        select(UserDailyStats).where(
            UserDailyStats.user_id == user_id,
            UserDailyStats.date >= today
        )
    )
    stats = stats_res.scalar_one_or_none()
    
    actual_seconds = stats.total_time_seconds if stats else 0
    actual_minutes = round(actual_seconds / 60, 1)
    actual_cards = stats.questions_attempted if stats else 0
    
    return {
        "daily_time_target": goal.daily_time_target,
        "daily_card_target": goal.daily_card_target,
        "daily_new_card_target": getattr(goal, 'daily_new_card_target', 10),
        "actual_time_minutes": actual_minutes,
        "actual_cards_completed": actual_cards
    }

@router.post("/goals/global")
async def update_global_goals(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserGlobalGoal
    from app.modules.auth.services.auth_service import AuthService
    from fastapi import HTTPException
    
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = user.id
    
    daily_time_target = int(data.get("daily_time_target", 20))
    daily_card_target = int(data.get("daily_card_target", 20))
    daily_new_card_target = int(data.get("daily_new_card_target", 10))
    
    res = await db.execute(select(UserGlobalGoal).filter(UserGlobalGoal.user_id == user_id))
    goal = res.scalar_one_or_none()
    if not goal:
        goal = UserGlobalGoal(
            user_id=user_id,
            daily_time_target=daily_time_target,
            daily_card_target=daily_card_target,
            daily_new_card_target=daily_new_card_target
        )
        db.add(goal)
    else:
        goal.daily_time_target = daily_time_target
        goal.daily_card_target = daily_card_target
        goal.daily_new_card_target = daily_new_card_target
        
    await db.commit()
    return {
        "status": "ok",
        "daily_time_target": goal.daily_time_target,
        "daily_card_target": goal.daily_card_target,
        "daily_new_card_target": goal.daily_new_card_target
    }

@router.get("/today-review")
async def get_today_review_endpoint(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.services.quiz_service import QuizService
    from fastapi import HTTPException
    user_id = int(request.cookies.get("user_id", 1))
    try:
        return await QuizService.get_today_review(db, user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/heatmap")
async def get_heatmap_stats(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.stats.models import UserDailyStats
    from datetime import datetime, timedelta
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=365)
    
    heatmap_stmt = select(
        UserDailyStats.date,
        UserDailyStats.questions_attempted
    ).where(
        UserDailyStats.user_id == user_id,
        UserDailyStats.date >= start_date
    ).order_by(UserDailyStats.date)
    
    results = await db.execute(heatmap_stmt)
    data = []
    for row in results.all():
        day_val = row[0]
        if isinstance(day_val, str):
            date_str = day_val[:10]
        elif day_val:
            date_str = day_val.strftime("%Y-%m-%d")
        else:
            date_str = ""
            
        data.append({
            "date": date_str,
            "count": row[1] or 0
        })
        
    return data

@router.get("/stats/weekly-report")
async def get_weekly_report(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.stats.models import UserDailyStats
    from datetime import datetime, timedelta
    from sqlalchemy import desc
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    today = datetime.utcnow().date()
    
    # Current week (last 7 days)
    start_cur = today - timedelta(days=6)
    cur_stmt = select(
        func.sum(UserDailyStats.questions_attempted).label("total_q"),
        func.sum(UserDailyStats.correct_answers).label("total_correct"),
        func.sum(UserDailyStats.total_time_seconds).label("total_time")
    ).where(
        UserDailyStats.user_id == user_id,
        UserDailyStats.date >= start_cur
    )
    cur_res = (await db.execute(cur_stmt)).one_or_none()
    
    # Previous week (prior 7 days)
    start_prev = today - timedelta(days=13)
    end_prev = today - timedelta(days=7)
    prev_stmt = select(
        func.sum(UserDailyStats.questions_attempted).label("total_q"),
        func.sum(UserDailyStats.correct_answers).label("total_correct"),
        func.sum(UserDailyStats.total_time_seconds).label("total_time")
    ).where(
        UserDailyStats.user_id == user_id,
        UserDailyStats.date >= start_prev,
        UserDailyStats.date <= end_prev
    )
    prev_res = (await db.execute(prev_stmt)).one_or_none()
    
    cur_q = cur_res.total_q or 0 if cur_res and cur_res.total_q else 0
    cur_correct = cur_res.total_correct or 0 if cur_res and cur_res.total_correct else 0
    cur_time = cur_res.total_time or 0 if cur_res and cur_res.total_time else 0
    cur_accuracy = round((cur_correct / cur_q * 100), 1) if cur_q > 0 else 0
    
    prev_q = prev_res.total_q or 0 if prev_res and prev_res.total_q else 0
    prev_correct = prev_res.total_correct or 0 if prev_res and prev_res.total_correct else 0
    prev_accuracy = round((prev_correct / prev_q * 100), 1) if prev_q > 0 else 0
    
    # Calculate deltas
    q_delta = cur_q - prev_q
    q_pct_change = round((q_delta / prev_q * 100), 1) if prev_q > 0 else 100.0 if cur_q > 0 else 0.0
    accuracy_delta = round(cur_accuracy - prev_accuracy, 1)
    
    # Best active weekday in last 7 days
    best_stmt = select(
        UserDailyStats.date,
        UserDailyStats.questions_attempted
    ).where(
        UserDailyStats.user_id == user_id,
        UserDailyStats.date >= start_cur
    ).order_by(desc(UserDailyStats.questions_attempted)).limit(1)
    best_res = (await db.execute(best_stmt)).first()
    
    best_day = "None"
    if best_res and best_res[0]:
        dt = best_res[0]
        if isinstance(dt, str):
            try:
                dt = datetime.strptime(dt[:10], "%Y-%m-%d")
            except Exception:
                pass
        if isinstance(dt, (datetime, date)):
            best_day = dt.strftime("%A")
        
    insights = []
    if cur_q == 0:
        insights = [
            "We noticed you haven't answered any questions this week. Set a simple goal of 5 cards today to kickstart your streak! 🚀",
            "Try studying at the same time each day to build a powerful long-term learning habit."
        ]
    else:
        insights.append(f"Awesome velocity! You attempted {cur_q} questions this week. Keep up this incredible momentum! 🔥")
        if accuracy_delta > 0:
            insights.append(f"Precision Boost! Your accuracy increased by {accuracy_delta}% compared to last week. Your retrieval speed is solid. 🎯")
        elif accuracy_delta < 0:
            insights.append("Focus Tip: Your accuracy fell slightly. Try turning on 'Incorrect Mistakes' learning mode to iron out weak cards. 🧠")
        else:
            insights.append("Great consistency! Your learning accuracy is holding perfectly steady. 📈")
            
        if cur_time > 1200:
            insights.append(f"Deep Focus: You spent {round(cur_time/60, 1)} minutes in deep study mode. Excellent focus stamina! ⏱️")
        else:
            insights.append("Habit Tip: Even 2 minutes of flashcard reviews daily triggers active recall and prevents forgetting! ⚡")
            
    return {
        "current_week": {
            "questions": cur_q,
            "accuracy": cur_accuracy,
            "time_minutes": round(cur_time / 60, 1)
        },
        "previous_week": {
            "questions": prev_q,
            "accuracy": prev_accuracy
        },
        "deltas": {
            "questions_change_pct": q_pct_change,
            "questions_change_absolute": q_delta,
            "accuracy_change": accuracy_delta
        },
        "best_day": best_day,
        "ai_insights": insights
    }

@router.get("/quizzes/{quiz_id}/mastery")
async def get_quiz_mastery(quiz_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.quiz.models import UserQuestionMastery, Question
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Count total questions in the quiz
    q_count_res = await db.execute(select(func.count(Question.id)).where(Question.quiz_id == quiz_id))
    total_questions = q_count_res.scalar() or 0
    
    # Get all mastered cards for this quiz
    mastery_stmt = select(
        UserQuestionMastery.box_level,
        func.count(UserQuestionMastery.id)
    ).join(Question, UserQuestionMastery.question_id == Question.id)\
     .where(Question.quiz_id == quiz_id, UserQuestionMastery.user_id == user_id)\
     .group_by(UserQuestionMastery.box_level)
     
    results = await db.execute(mastery_stmt)
    
    mastery_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for row in results.all():
        lvl = row[0]
        if lvl in mastery_counts:
            mastery_counts[lvl] = row[1]
            
    unattempted = max(0, total_questions - sum(mastery_counts.values()))
    mastery_counts[1] += unattempted # Treat unattempted questions as Level 1 (New)
    
    return {
        "new": mastery_counts[1],
        "learning": mastery_counts[2],
        "familiar": mastery_counts[3] + mastery_counts[4],
        "mastered": mastery_counts[5],
        "total": total_questions
    }

@router.get("/stats/leitner")
async def get_global_leitner_stats(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.quiz.models import UserQuestionMastery, Question
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Query count of questions grouped by box_level
    stmt = select(
        UserQuestionMastery.box_level,
        func.count(UserQuestionMastery.id)
    ).where(UserQuestionMastery.user_id == user_id).group_by(UserQuestionMastery.box_level)
    
    results = await db.execute(stmt)
    
    box_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for row in results.all():
        lvl = row[0]
        if lvl in box_counts:
            box_counts[lvl] = row[1]
            
    total_tracked = sum(box_counts.values())
    mastery_percentage = round((box_counts[5] / total_tracked * 100), 1) if total_tracked > 0 else 0
    
    # We can also get a list of the user's hardest cards (e.g. up to 5 cards in Box 1)
    hardest_cards_stmt = select(Question)\
        .join(UserQuestionMastery, Question.id == UserQuestionMastery.question_id)\
        .where(UserQuestionMastery.user_id == user_id, UserQuestionMastery.box_level == 1)\
        .limit(5)
        
    hardest_cards_res = await db.execute(hardest_cards_stmt)
    hardest_cards = [{
        "id": q.id,
        "content": q.content,
        "explanation": q.explanation,
        "quiz_id": q.quiz_id
    } for q in hardest_cards_res.scalars().all()]
    
    return {
        "box_distribution": [
            {"box": 1, "count": box_counts[1], "label": "Box 1: Hard"},
            {"box": 2, "count": box_counts[2], "label": "Box 2: Learning"},
            {"box": 3, "count": box_counts[3], "label": "Box 3: Familiar"},
            {"box": 4, "count": box_counts[4], "label": "Box 4: Proficient"},
            {"box": 5, "count": box_counts[5], "label": "Box 5: Mastered"}
        ],
        "total_tracked": total_tracked,
        "mastery_percentage": mastery_percentage,
        "hardest_cards": hardest_cards
    }

@router.get("/stats/speed-accuracy")
async def get_speed_accuracy_stats(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.quiz.models import UserAnswer, QuizAttempt
    from sqlalchemy import func, case
    
    user = await AuthService.get_current_user(request, db)
    user_id = user.id if user else 1
    
    # Run database-level aggregation to bin and summarize speeds
    stmt = select(
        func.sum(case((UserAnswer.active_time <= 3.0, 1), else_=0)).label("fast_total"),
        func.sum(case(((UserAnswer.active_time <= 3.0) & UserAnswer.is_correct, 1), else_=0)).label("fast_correct"),
        
        func.sum(case(((UserAnswer.active_time > 3.0) & (UserAnswer.active_time <= 7.0), 1), else_=0)).label("optimal_total"),
        func.sum(case(((UserAnswer.active_time > 3.0) & (UserAnswer.active_time <= 7.0) & UserAnswer.is_correct, 1), else_=0)).label("optimal_correct"),
        
        func.sum(case(((UserAnswer.active_time > 7.0) & (UserAnswer.active_time <= 15.0), 1), else_=0)).label("calculated_total"),
        func.sum(case(((UserAnswer.active_time > 7.0) & (UserAnswer.active_time <= 15.0) & UserAnswer.is_correct, 1), else_=0)).label("calculated_correct"),
        
        func.sum(case((UserAnswer.active_time > 15.0, 1), else_=0)).label("deep_total"),
        func.sum(case(((UserAnswer.active_time > 15.0) & UserAnswer.is_correct, 1), else_=0)).label("deep_correct"),
        
        func.sum(case((UserAnswer.is_correct, UserAnswer.active_time), else_=0.0)).label("sum_time_correct"),
        func.sum(case((UserAnswer.is_correct, 1), else_=0)).label("count_correct"),
        
        func.sum(case((~UserAnswer.is_correct, UserAnswer.active_time), else_=0.0)).label("sum_time_wrong"),
        func.sum(case((~UserAnswer.is_correct, 1), else_=0)).label("count_wrong"),
        
        func.count().label("total_answers_analyzed")
    ).join(QuizAttempt, UserAnswer.attempt_id == QuizAttempt.id)\
     .where(QuizAttempt.user_id == user_id, UserAnswer.active_time > 0)
     
    results = await db.execute(stmt)
    row = results.first()
    
    # Safe fallback if there are no answers or SQLite returns all Nulls
    if not row or not row.total_answers_analyzed:
        return {
            "bins": [
                {"bin": "fast", "label": "Fast (0-3s)", "accuracy": 0.0, "total": 0, "correct": 0},
                {"bin": "optimal", "label": "Optimal (3-7s)", "accuracy": 0.0, "total": 0, "correct": 0},
                {"bin": "calculated", "label": "Calculated (7-15s)", "accuracy": 0.0, "total": 0, "correct": 0},
                {"bin": "deep", "label": "Deep (15s+)", "accuracy": 0.0, "total": 0, "correct": 0}
            ],
            "avg_speed_correct": 0.0,
            "avg_speed_wrong": 0.0,
            "total_answers_analyzed": 0
        }
        
    # Extract values
    fast_total = row.fast_total or 0
    fast_correct = row.fast_correct or 0
    optimal_total = row.optimal_total or 0
    optimal_correct = row.optimal_correct or 0
    calculated_total = row.calculated_total or 0
    calculated_correct = row.calculated_correct or 0
    deep_total = row.deep_total or 0
    deep_correct = row.deep_correct or 0
    
    sum_time_correct = row.sum_time_correct or 0.0
    count_correct = row.count_correct or 0
    sum_time_wrong = row.sum_time_wrong or 0.0
    count_wrong = row.count_wrong or 0
    total_answers_analyzed = row.total_answers_analyzed or 0
    
    bin_data = [
        {
            "bin": "fast",
            "label": "Fast (0-3s)",
            "accuracy": round((fast_correct / fast_total * 100), 1) if fast_total > 0 else 0.0,
            "total": fast_total,
            "correct": fast_correct
        },
        {
            "bin": "optimal",
            "label": "Optimal (3-7s)",
            "accuracy": round((optimal_correct / optimal_total * 100), 1) if optimal_total > 0 else 0.0,
            "total": optimal_total,
            "correct": optimal_correct
        },
        {
            "bin": "calculated",
            "label": "Calculated (7-15s)",
            "accuracy": round((calculated_correct / calculated_total * 100), 1) if calculated_total > 0 else 0.0,
            "total": calculated_total,
            "correct": calculated_correct
        },
        {
            "bin": "deep",
            "label": "Deep (15s+)",
            "accuracy": round((deep_correct / deep_total * 100), 1) if deep_total > 0 else 0.0,
            "total": deep_total,
            "correct": deep_correct
        }
    ]
    
    avg_speed_correct = round(sum_time_correct / count_correct, 1) if count_correct > 0 else 0.0
    avg_speed_wrong = round(sum_time_wrong / count_wrong, 1) if count_wrong > 0 else 0.0
    
    return {
        "bins": bin_data,
        "avg_speed_correct": avg_speed_correct,
        "avg_speed_wrong": avg_speed_wrong,
        "total_answers_analyzed": total_answers_analyzed
    }

