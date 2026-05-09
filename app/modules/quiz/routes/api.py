from fastapi import APIRouter, UploadFile, File, Depends, Request
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

    q_res = await db.execute(select(Question).filter(Question.id == question_id))
    question = q_res.scalar_one_or_none()
    
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
        await db.commit()

    # --- Gamification Logic ---
    xp_gain = 10 if is_correct else 2
    gamify_res = await GamificationInterface.add_xp(db, user_id, xp_gain)
    await GamificationInterface.update_streak(db, user_id)

    if gamify_res["level_up"]:
        await NotificationInterface.send(
            db, user_id, 
            "LEVEL UP! 🚀", 
            f"Congratulations! You reached level {gamify_res['current_level']}!",
            "level_up"
        )

    # --- Stats Logic ---
    await StatsInterface.record_activity(db, user_id, is_correct, time_spent)

    return {"status": "ok", "xp_gained": xp_gain, "level_up": gamify_res["level_up"]}

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
        select(func.date(UserAnswer.id), func.count(UserAnswer.id))
        .group_by(func.date(UserAnswer.id))
        .limit(7)
    )
    activity = activity_res.all()
    
    return {
        "overall_accuracy": accuracy,
        "total_answers": total,
        "correct_answers": correct,
        "activity_data": activity
    }

@router.get("/{quiz_id}/play-data")
async def get_quiz_play_data(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    user_id = int(request.cookies.get("user_id", 1))
    quiz = await QuizService.get_quiz_with_stats(db, quiz_id, user_id=user_id)
    if not quiz: return JSONResponse(status_code=404, content={"error": "Quiz not found"})
    
    # Format for frontend
    return {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "ai_prompt": quiz.ai_prompt,
        "category_id": quiz.category_id,
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

@router.post("/{quiz_id}/ask-ai")
async def ask_ai(quiz_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    question_id = payload.get("question_id")
    from app.modules.quiz.models import Question
    result = await db.execute(select(Question).filter(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q: return {"error": "Not found"}
    
    # Accept manual AI explanation if provided by creator
    if "ai_explanation" in payload:
        ai_response = payload["ai_explanation"]
    else:
        # Simulate AI Generation
        ai_response = f"--- PHÂN TÍCH CHUYÊN SÂU TỪ AI ---\n\n" \
                      f"Câu hỏi này kiểm tra kiến thức về: '{q.content[:30]}...'\n\n" \
                      f"1. Tại sao đáp án đó đúng? (Dựa trên ngữ pháp và ngữ cảnh chuyên sâu).\n" \
                      f"2. Các lỗi sai thường gặp khi làm câu này.\n" \
                      f"3. Mẹo nhớ lâu: Sử dụng quy tắc liên tưởng hình ảnh."
    
    q.ai_explanation = ai_response
    await db.commit()
    return {"ai_explanation": ai_response}

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
async def update_quiz(quiz_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import Quiz
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz: return JSONResponse(status_code=404, content={"error": "Quiz not found"})
    
    if "title" in data: quiz.title = data["title"]
    if "description" in data: quiz.description = data["description"]
    if "category_id" in data: quiz.category_id = data["category_id"]
    if "ai_prompt" in data: quiz.ai_prompt = data["ai_prompt"]
    
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
