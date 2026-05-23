from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, desc
from sqlalchemy.orm import selectinload
from app.core.db import get_db
from app.modules.quiz.models import Quiz, Question, Option, QuizRoom, QuizRoomParticipant, QuizAttempt, UserAnswer, QuizRoomChat
from app.modules.auth.services.auth_service import AuthService
import random
import string
from datetime import datetime, date

router = APIRouter(prefix="/quiz/room", tags=["Quiz Room"])

def generate_room_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@router.get("/active")
async def get_active_rooms(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    # Discover Arena: active or waiting rooms hosted by others
    discover_stmt = select(QuizRoom)\
        .where(QuizRoom.status != "finished", QuizRoom.host_id != user.id)\
        .options(selectinload(QuizRoom.quiz), selectinload(QuizRoom.participants))\
        .order_by(QuizRoom.created_at.desc())
    
    discover_res = await db.execute(discover_stmt)
    discover_rooms = []
    for r in discover_res.scalars().all():
        room_settings = r.settings or {}
        discover_rooms.append({
            "id": r.id,
            "room_code": r.room_code,
            "quiz_title": r.quiz.title if r.quiz else "Untitled",
            "quiz_id": r.quiz_id,
            "status": r.status,
            "participant_count": len(r.participants),
            "requires_password": bool(room_settings.get("password")),
            "game_mode": room_settings.get("game_mode", "chill")
        })
        
    # My Rooms: active or waiting rooms where user is host or participant
    my_stmt = select(QuizRoom)\
        .join(QuizRoomParticipant)\
        .where(QuizRoom.status != "finished", QuizRoomParticipant.user_id == user.id)\
        .options(selectinload(QuizRoom.quiz), selectinload(QuizRoom.participants))\
        .order_by(QuizRoom.created_at.desc())
        
    my_res = await db.execute(my_stmt)
    my_rooms = []
    for r in my_res.scalars().all():
        room_settings = r.settings or {}
        my_rooms.append({
            "id": r.id,
            "room_code": r.room_code,
            "quiz_title": r.quiz.title if r.quiz else "Untitled",
            "quiz_id": r.quiz_id,
            "status": r.status,
            "participant_count": len(r.participants),
            "requires_password": bool(room_settings.get("password")),
            "game_mode": room_settings.get("game_mode", "chill"),
            "is_host": r.host_id == user.id
        })
        
    return {
        "discover_rooms": discover_rooms,
        "my_rooms": my_rooms
    }

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
        
    game_mode = data.get("game_mode", "chill")
    time_limit = data.get("time_limit", 20)
    password = data.get("password")
    
    room_settings = data.get("settings", {})
    room_settings.update({
        "game_mode": game_mode,
        "time_limit": time_limit,
        "password": password,
        "current_question_index": 0
    })
        
    room = QuizRoom(
        quiz_id=quiz_id,
        room_code=room_code,
        host_id=user.id,
        status="waiting",
        settings=room_settings
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
        
    password = data.get("password")
        
    result = await db.execute(
        select(QuizRoom).where(QuizRoom.room_code == room_code.upper()).options(selectinload(QuizRoom.participants))
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    if room.status == "finished":
        raise HTTPException(status_code=400, detail="Room is already closed")
        
    room_settings = room.settings or {}
    expected_password = room_settings.get("password")
    if expected_password and expected_password != password:
        raise HTTPException(status_code=401, detail="Incorrect room password")
        
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
        "settings": room.settings,
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
    
    # Record in personal log (QuizAttempt)
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
        
    # Game mode logic
    room_settings = room.settings or {}
    mode = room_settings.get("game_mode", "chill")
    time_limit = float(room_settings.get("time_limit", 20))
    
    # 1. Survival mode lives verification
    if mode == "survival":
        # Check current incorrect answers in this attempt
        wrong_count_res = await db.execute(
            select(func.count(UserAnswer.id)).where(
                UserAnswer.attempt_id == attempt.id,
                UserAnswer.is_correct == False
            )
        )
        wrong_count = wrong_count_res.scalar() or 0
        remaining_lives = max(0, 3 - wrong_count)
        if remaining_lives <= 0:
            raise HTTPException(status_code=403, detail="You are eliminated from this arena!")
            
    # Calculate score with speed bonus
    points_gained = 0
    if is_correct:
        if mode in ["competitive", "survival"]:
            # remaining time = time_limit - time_spent
            remaining_time = max(0.0, time_limit - float(time_spent))
            speed_bonus = round((remaining_time / time_limit) * 50)
            points_gained = 100 + speed_bonus
        else:
            points_gained = 100  # Default base score
    else:
        points_gained = 0
        
    # Update Room Stats
    participant.score += points_gained
    participant.total_answered += 1
        
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

@router.post("/{room_code}/chat")
async def post_room_chat(request: Request, room_code: str, data: dict, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    msg = data.get("message", "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Empty message")
        
    room_res = await db.execute(select(QuizRoom).where(QuizRoom.room_code == room_code.upper()))
    room = room_res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    chat = QuizRoomChat(
        room_id=room.id,
        user_id=user.id,
        message=msg
    )
    db.add(chat)
    await db.commit()
    return {"status": "ok"}

@router.get("/{room_code}/chat")
async def get_room_chats(room_code: str, db: AsyncSession = Depends(get_db)):
    room_res = await db.execute(select(QuizRoom).where(QuizRoom.room_code == room_code.upper()))
    room = room_res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    chat_stmt = select(QuizRoomChat)\
        .where(QuizRoomChat.room_id == room.id)\
        .options(selectinload(QuizRoomChat.user))\
        .order_by(QuizRoomChat.created_at.asc())\
        .limit(50)
        
    results = await db.execute(chat_stmt)
    chats = []
    for c in results.scalars().all():
        chats.append({
            "id": c.id,
            "username": c.user.username,
            "message": c.message,
            "created_at": c.created_at.isoformat()
        })
    return chats

@router.post("/{room_code}/next-question")
async def next_room_question(request: Request, room_code: str, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    room_res = await db.execute(select(QuizRoom).where(QuizRoom.room_code == room_code.upper()))
    room = room_res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    if room.host_id != user.id:
        raise HTTPException(status_code=403, detail="Only the host can advance the question")
        
    room_settings = room.settings or {}
    current_idx = room_settings.get("current_question_index", 0)
    
    # Update in settings JSON
    new_settings = dict(room_settings)
    new_settings["current_question_index"] = current_idx + 1
    room.settings = new_settings
    
    await db.commit()
    return {"status": "ok", "current_question_index": current_idx + 1}

@router.post("/{room_code}/end")
async def end_room(request: Request, room_code: str, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    result = await db.execute(select(QuizRoom).where(QuizRoom.room_code == room_code.upper()))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    if room.host_id != user.id:
        raise HTTPException(status_code=403, detail="Only host can terminate the room")
        
    room.status = "finished"
    room.finished_at = datetime.utcnow()
    await db.commit()
    return {"status": "ok"}
