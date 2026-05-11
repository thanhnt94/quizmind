from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload
from app.core.db import get_db
from app.modules.quiz.models import Quiz, Question, Option, QuizRoom, QuizRoomParticipant, QuizAttempt, UserAnswer
from app.modules.auth.services.auth_service import AuthService
import random
import string
from datetime import datetime

router = APIRouter(prefix="/quiz/room", tags=["Quiz Room"])

def generate_room_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@router.post("/create")
async def create_room(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    quiz_id = data.get("quiz_id")
    if not quiz_id:
        raise HTTPException(status_code=400, detail="Quiz ID required")
    
    # Check if quiz exists
    quiz_res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    if not quiz_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Generate unique code
    room_code = generate_room_code()
    while (await db.execute(select(QuizRoom).where(QuizRoom.room_code == room_code))).scalar_one_or_none():
        room_code = generate_room_code()
        
    room = QuizRoom(
        quiz_id=quiz_id,
        room_code=room_code,
        host_id=user.id,
        status="waiting",
        settings=data.get("settings", {})
    )
    db.add(room)
    await db.flush()
    
    # Host automatically joins
    participant = QuizRoomParticipant(
        room_id=room.id,
        user_id=user.id,
        is_ready=True
    )
    db.add(participant)
    
    await db.commit()
    return {"room_code": room_code, "id": room.id}

@router.post("/join")
async def join_room(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    room_code = data.get("room_code")
    if not room_code:
        raise HTTPException(status_code=400, detail="Room code required")
        
    result = await db.execute(
        select(QuizRoom).where(QuizRoom.room_code == room_code.upper()).options(selectinload(QuizRoom.participants))
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    if room.status == "finished":
        raise HTTPException(status_code=400, detail="Room is already closed")
        
    # Check if already joined
    participant = next((p for p in room.participants if p.user_id == user.id), None)
    if not participant:
        participant = QuizRoomParticipant(
            room_id=room.id,
            user_id=user.id
        )
        db.add(participant)
        await db.commit()
        
    return {"status": "ok", "room_id": room.id, "quiz_id": room.quiz_id}

@router.get("/{room_code}")
async def get_room_details(room_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QuizRoom)
        .where(QuizRoom.room_code == room_code.upper())
        .options(
            selectinload(QuizRoom.participants).selectinload(QuizRoomParticipant.user),
            selectinload(QuizRoom.quiz)
        )
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    return {
        "id": room.id,
        "room_code": room.room_code,
        "status": room.status,
        "quiz_title": room.quiz.title,
        "quiz_id": room.quiz_id,
        "host_id": room.host_id,
        "participants": [
            {
                "user_id": p.user.id,
                "username": p.user.username,
                "is_ready": p.is_ready,
                "score": p.score,
                "total_answered": p.total_answered
            } for p in room.participants
        ]
    }

@router.post("/{room_code}/start")
async def start_room(request: Request, room_code: str, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    result = await db.execute(select(QuizRoom).where(QuizRoom.room_code == room_code.upper()))
    room = result.scalar_one_or_none()
    
    if not room or room.host_id != user.id:
        raise HTTPException(status_code=403, detail="Only host can start the room")
        
    room.status = "active"
    room.started_at = datetime.utcnow()
    await db.commit()
    return {"status": "ok"}

@router.post("/{room_code}/submit")
async def submit_room_answer(request: Request, room_code: str, data: dict, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    result = await db.execute(
        select(QuizRoom).where(QuizRoom.room_code == room_code.upper()).options(selectinload(QuizRoom.participants))
    )
    room = result.scalar_one_or_none()
    if not room or room.status != "active":
        raise HTTPException(status_code=400, detail="Room is not active")
        
    participant = next((p for p in room.participants if p.user_id == user.id), None)
    if not participant:
        raise HTTPException(status_code=403, detail="You are not in this room")
        
    question_id = data.get("question_id")
    option_id = data.get("option_id")
    is_correct = data.get("is_correct", False)
    time_spent = data.get("time_spent", 0)
    
    # 1. Update Room Stats
    participant.score += (1 if is_correct else 0)
    participant.total_answered += 1
    
    # 2. Record in personal log (QuizAttempt)
    # Similar to record_answer logic in api.py
    attempt_res = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == user.id, QuizAttempt.quiz_id == room.quiz_id)
        .order_by(QuizAttempt.id.desc())
    )
    attempt = attempt_res.scalar()
    if not attempt:
        attempt = QuizAttempt(user_id=user.id, quiz_id=room.quiz_id, mode="room")
        db.add(attempt)
        await db.flush()
        
    db_answer = UserAnswer(
        attempt_id=attempt.id,
        question_id=question_id,
        selected_option_id=option_id,
        is_correct=is_correct,
        active_time=float(time_spent)
    )
    db.add(db_answer)
    
    # Update total questions in attempt
    attempt.total_questions += 1
    if is_correct:
        attempt.score += 1
        
    await db.commit()
    return {"status": "ok", "participant_score": participant.score}

@router.get("/{room_code}/leaderboard")
async def get_leaderboard(room_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QuizRoomParticipant)
        .join(QuizRoom)
        .where(QuizRoom.room_code == room_code.upper())
        .options(selectinload(QuizRoomParticipant.user))
        .order_by(QuizRoomParticipant.score.desc(), QuizRoomParticipant.total_answered.asc())
    )
    participants = result.scalars().all()
    
    return [
        {
            "username": p.user.username,
            "score": p.score,
            "total_answered": p.total_answered
        } for p in participants
    ]
