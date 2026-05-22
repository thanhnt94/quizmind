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
        
        for q in questions:
            question_data = QuestionSchema(
                content=q["content"],
                image=q.get("image"),
                audio=q.get("audio"),
                question_type=q.get("question_type", "normal"),
                explanation=q["explanation"],
                options=[OptionSchema(content=o["content"], is_correct=o["is_correct"]) for o in q["options"]]
            )
            await QuizService.add_question(db, db_quiz.id, question_data)
            
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
    from app.modules.quiz.models import UserAnswer, Question, QuizAttempt
    from app.modules.gamification.interface import GamificationInterface
    from app.modules.stats.interface import StatsInterface
    from app.modules.notification.interface import NotificationInterface
 
    user_id = int(request.cookies.get("user_id", 1)) # Default to 1 for demo
    is_correct = data.get("is_correct", False)
    time_spent = int(data.get("time_spent", 0))
    question_id = int(data.get("question_id"))
    selected_option_id = int(data.get("option_id")) if data.get("option_id") else None
    local_date = data.get("local_date")

    q_res = await db.execute(select(Question).filter(Question.id == question_id))
    question = q_res.scalar_one_or_none()
    
    goal_update_info = None

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

    # --- Gamification Logic ---
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

    # --- Stats Logic ---
    await StatsInterface.record_activity(db, user_id, is_correct, time_spent)

    return {
        "status": "ok", 
        "xp_gained": xp_gain + (goal_update_info["bonus_xp"] if goal_update_info else 0), 
        "level_up": has_leveled_up,
        "goal_update": goal_update_info
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
async def get_quiz_play_data(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    quiz = await QuizService.get_quiz_with_stats(db, quiz_id, user_id=user_id)
    if not quiz: return JSONResponse(status_code=404, content={"error": "Quiz not found"})
    
    from app.modules.gamification.interface import GamificationInterface
    user_stats = await GamificationInterface.get_user_stats(db, user_id)
    
    from app.modules.quiz.models import QuizCollaborator
    collab_res = await db.execute(select(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id, QuizCollaborator.user_id == user_id))
    is_collaborator = collab_res.scalar() is not None
    
    # Format for frontend
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
                "stats": q.stats,
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

@router.get("/{quiz_id}/notes")
async def get_quiz_notes(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import UserQuestionNote, Question
    user_id = int(request.cookies.get("user_id", 1))
    result = await db.execute(
        select(UserQuestionNote).join(Question).where(UserQuestionNote.user_id == user_id, Question.quiz_id == quiz_id)
    )
    notes = result.scalars().all()
    return {n.question_id: n.content for n in notes}

@router.get("/{quiz_id}/questions")
async def get_quiz_questions(quiz_id: int, page: int = 1, size: int = 50, search: str = "", db: AsyncSession = Depends(get_db)):
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
    from app.modules.quiz.models import UserAnswer
    q_ids = [q.id for q in qs]
    stats_query = select(
        UserAnswer.question_id,
        func.count(UserAnswer.id).label("total"),
        func.sum(func.cast(UserAnswer.is_correct, Integer)).label("correct")
    ).where(UserAnswer.question_id.in_(q_ids)).group_by(UserAnswer.question_id)
    stats_res = await db.execute(stats_query)
    stats_map = {r.question_id: {"total": r.total, "correct": r.correct, "wrong": r.total - r.correct} for r in stats_res}
    
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
    import math
    from datetime import datetime
    
    user_id = int(request.cookies.get("user_id", 1))
    if not local_date:
        local_date = datetime.utcnow().strftime("%Y-%m-%d")

    res = await db.execute(
        select(UserQuizGoal).filter(UserQuizGoal.user_id == user_id, UserQuizGoal.status == "active")
    )
    goals = res.scalars().all()

    goals_data = []
    for goal in goals:
        # Fetch quiz info
        quiz_res = await db.execute(select(Quiz).filter(Quiz.id == goal.quiz_id))
        quiz = quiz_res.scalar_one_or_none()
        if not quiz:
            continue
            
        # Count total questions in quiz
        q_count_res = await db.execute(select(func.count(Question.id)).filter(Question.quiz_id == goal.quiz_id))
        total_questions = q_count_res.scalar() or 0
        
        # Count total learned/answered questions by user
        learned_res = await db.execute(
            select(func.count(func.distinct(Question.id)))
            .join(UserAnswer, UserAnswer.question_id == Question.id)
            .join(QuizAttempt, QuizAttempt.id == UserAnswer.attempt_id)
            .filter(Question.quiz_id == goal.quiz_id, QuizAttempt.user_id == user_id)
        )
        total_learned = learned_res.scalar() or 0
        
        # Get today's progress
        prog_res = await db.execute(
            select(UserDailyProgress).filter(
                UserDailyProgress.goal_id == goal.id,
                UserDailyProgress.date == local_date
            )
        )
        progress = prog_res.scalar_one_or_none()
        
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
