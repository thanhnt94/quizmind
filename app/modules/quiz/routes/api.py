from fastapi import APIRouter, UploadFile, File, Depends, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from app.core.db import get_db
from app.modules.quiz.services.excel_service import ExcelQuizService
from app.modules.quiz.services.quiz_service import QuizService
from app.modules.quiz.services.ai_service import ai_service
from app.modules.quiz.schemas import QuizSchema, QuestionSchema, OptionSchema
import json

router = APIRouter(prefix="/quiz", tags=["Quiz"])

@router.post("/upload")
async def upload_quiz(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    try:
        content = await file.read()
        metadata, questions = ExcelQuizService.parse_quiz_excel(content)
        
        if not questions:
            return RedirectResponse(url="/quiz/import?error=No valid questions found", status_code=303)

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
        quiz_data = QuizSchema(
            title=metadata.get("title", f"Import: {file.filename.split('.')[0]}"),
            description=metadata.get("description", f"Batch import with {len(questions)} questions."),
            category_id=db_cat.id,
            is_active=True
        )
        db_quiz = await QuizService.create_quiz(db, quiz_data)
        
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
            
        return RedirectResponse(url="/", status_code=303)
    except Exception as e:
        import traceback
        print(f"Upload Error: {traceback.format_exc()}")
        return RedirectResponse(url=f"/quiz/import?error={str(e)}", status_code=303)

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
    question_id = data.get("question_id")

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
            selected_option_id=data.get("selected_option_id"),
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
async def get_quiz_session(quiz_id: int, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizSession
    result = await db.execute(select(QuizSession).filter(QuizSession.quiz_id == quiz_id))
    session = result.scalar_one_or_none()
    if not session: return None
    return {
        "mode": session.mode,
        "current_index": session.current_index,
        "state": json.loads(session.state_json) if session.state_json else {}
    }

@router.post("/{quiz_id}/session")
async def save_quiz_session(quiz_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.models import QuizSession
    result = await db.execute(select(QuizSession).filter(QuizSession.quiz_id == quiz_id))
    session = result.scalar_one_or_none()
    if not session:
        session = QuizSession(quiz_id=quiz_id)
        db.add(session)
    
    session.mode = data.get("mode")
    session.current_index = data.get("current_index", 0)
    session.state_json = json.dumps(data.get("state", {}))
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
async def get_quiz_questions(quiz_id: int, page: int = 1, size: int = 50, db: AsyncSession = Depends(get_db)):
    from app.modules.quiz.services.quiz_service import QuizService
    quiz = await QuizService.get_quiz_with_stats(db, quiz_id)
    if not quiz: return {"questions": []}
    
    start = (page - 1) * size
    end = start + size
    qs = quiz.questions[start:end]
    
    return {
        "questions": [
            {
                "id": q.id,
                "orig_index": start + i + 1,
                "content": q.content,
                "stats": q.stats
            } for i, q in enumerate(qs)
        ],
        "total": len(quiz.questions)
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
    
    result = await db.execute(
        select(QuizAttempt).where(QuizAttempt.user_id == user_id, QuizAttempt.quiz_id == quiz_id)
    )
    attempt = result.scalar_one_or_none()
    
    if attempt:
        attempt.is_archived = not attempt.is_archived
        await db.commit()
    
    return {"status": "ok"}
