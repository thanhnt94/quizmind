from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.modules.auth.services.auth_service import AuthService
from app.modules.stats.services.analytics_service import AnalyticsService

router = APIRouter(tags=["Stats"])

@router.get("/stats/detailed")
async def get_detailed_stats(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_user_detailed_stats(db, user.id)
    except Exception as e:
        return {"error": str(e)}

@router.get("/stats/leaderboard")
async def get_leaderboard(request: Request, time_filter: str = "all_time", db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_leaderboard(db, user.id, time_filter=time_filter)
    except Exception as e:
        return {"error": str(e)}

@router.get("/stats/heatmap")
async def get_heatmap(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_heatmap(db, user.id)
    except Exception as e:
        return {"error": str(e)}

@router.get("/stats/daily-comparison")
async def get_daily_comparison(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_daily_comparison_stats(db, user.id)
    except Exception as e:
        return {"error": str(e)}

@router.get("/stats/daily-summary")
async def get_daily_summary(request: Request, tz_offset: int = -420, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_daily_summary(db, user.id, tz_offset=tz_offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/weekly-report")
async def get_weekly_report(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_weekly_report(db, user.id)
    except Exception as e:
        return {"error": str(e)}

@router.get("/stats/speed-accuracy")
async def get_speed_accuracy(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_speed_accuracy_stats(db, user.id)
    except Exception as e:
        return {"error": str(e)}


@router.get("/dashboard/data")
async def get_dashboard_data(request: Request, only_created: bool = False, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id_int = user.id

    from sqlalchemy import select, func, case, or_
    from sqlalchemy.orm import selectinload
    from app.modules.quiz.models import Quiz, Question, QuizAttempt, UserAnswer, UserQuestionMastery, UserQuizSettings, QuizCollaborator
    from app.modules.auth.models import User as UserDB
    from app.modules.gamification.interface import GamificationInterface
    from app.modules.stats.interface import StatsInterface

    # 1. Attempts summary for this user
    subq = select(
        QuizAttempt.quiz_id,
        func.max(case((QuizAttempt.is_archived == True, 1), else_=0)).label("is_archived"),
        func.max(func.coalesce(UserAnswer.created_at, QuizAttempt.started_at)).label("last_studied_at")
    ).outerjoin(
        UserAnswer, QuizAttempt.id == UserAnswer.attempt_id
    ).where(
        QuizAttempt.user_id == user_id_int
    ).group_by(
        QuizAttempt.quiz_id
    ).subquery()

    collab_sub = select(QuizCollaborator.quiz_id).where(QuizCollaborator.user_id == user_id_int)
    q_count_sub = select(func.count(Question.id)).where(Question.quiz_id == Quiz.id).scalar_subquery().label("c_count")

    # 2. Query Quizzes (attempted, created, collaborated, or all active quizzes if none)
    query_a = select(
        Quiz,
        q_count_sub,
        subq.c.is_archived,
        subq.c.last_studied_at
    ).outerjoin(
        subq, Quiz.id == subq.c.quiz_id
    ).options(
        selectinload(Quiz.tags)
    ).where(
        or_(
            subq.c.quiz_id.is_not(None),
            Quiz.creator_id == user_id_int,
            Quiz.id.in_(collab_sub)
        )
    ).order_by(
        subq.c.last_studied_at.desc().nulls_last(),
        Quiz.created_at.desc()
    )

    # 3. Query Mastery progress for user
    query_mastery = select(
        Question.quiz_id,
        func.count(UserQuestionMastery.id).label("learned_count"),
        func.sum(case((UserQuestionMastery.box_level >= 4, 1), else_=0)).label("mastered_count")
    ).join(
        UserQuestionMastery, UserQuestionMastery.question_id == Question.id
    ).where(
        UserQuestionMastery.user_id == user_id_int,
        or_(UserQuestionMastery.is_ignored == False, UserQuestionMastery.is_ignored.is_(None))
    ).group_by(Question.quiz_id)

    # 4. User Quiz Settings
    query_user_settings = select(
        UserQuizSettings.quiz_id,
        UserQuizSettings.settings
    ).where(UserQuizSettings.user_id == user_id_int)

    # 5. Creators
    query_users = select(UserDB.id, UserDB.username)

    # Execute queries
    res_a = await db.execute(query_a)
    res_users = await db.execute(query_users)
    res_mastery = await db.execute(query_mastery)
    res_user_settings = await db.execute(query_user_settings)

    creator_map = {row[0]: row[1] for row in res_users.all()}
    mastery_map = {row[0]: {"learned": row[1] or 0, "mastered": row[2] or 0} for row in res_mastery.all()}
    user_settings_map = {row[0]: row[1] for row in res_user_settings.all() if row[1]}

    my_quizzes = []
    archived_quizzes = []
    my_rows = res_a.all()

    # If user has no specific attempts/creations yet, default to showing all active quizzes in "My Quizzes"
    if not my_rows:
        fallback_res = await db.execute(
            select(Quiz, q_count_sub).options(selectinload(Quiz.tags)).where(Quiz.is_active == True)
        )
        for row in fallback_res.all():
            q, count = row
            my_rows.append((q, count, 0, None))

    seen_quiz_ids = set()
    for row in my_rows:
        q, count, is_arch, last_studied = row
        if q.id in seen_quiz_ids:
            continue
        seen_quiz_ids.add(q.id)

        prog = mastery_map.get(q.id, {"learned": 0, "mastered": 0})
        total_cnt = count or 0
        learned_cnt = prog.get("learned", 0)
        mastered_cnt = prog.get("mastered", 0)
        pct = round((learned_cnt / total_cnt) * 100) if total_cnt > 0 else 0
        c_name = creator_map.get(q.creator_id, user.username if q.creator_id == user_id_int else ("System" if not q.creator_id else f"user_{q.creator_id}"))

        custom_setting = user_settings_map.get(q.id)
        settings_data = custom_setting if (custom_setting and isinstance(custom_setting, dict)) else (q.practice_settings or {})
        pipeline = settings_data.get("pipeline", [])
        has_roadmap = bool(settings_data.get("roadmap_active", False) and isinstance(pipeline, list) and len(pipeline) > 0)

        quiz_dict = {
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "cover_image": q.cover_image,
            "questions_count": total_cnt,
            "cards_count": total_cnt,
            "tags": [t.name for t in getattr(q, 'tags', [])],
            "creator_id": q.creator_id,
            "creator_name": c_name,
            "is_creator": bool(q.creator_id == user_id_int or user.role == "admin" or getattr(user, "is_admin", False) or user_id_int == 1),
            "is_public": True,
            "practice_settings": q.practice_settings or {},
            "has_roadmap": has_roadmap,
            "learned_count": learned_cnt,
            "mastered_count": mastered_cnt,
            "progress_percent": pct,
            "last_studied_at": last_studied.isoformat() if last_studied else None,
            "created_at": q.created_at.isoformat() if q.created_at else None
        }
        if is_arch:
            archived_quizzes.append(quiz_dict)
        else:
            my_quizzes.append(quiz_dict)

    # Discover quizzes: any active quizzes not in my_quizzes
    discover_res = await db.execute(
        select(Quiz, q_count_sub).options(selectinload(Quiz.tags)).where(
            Quiz.is_active == True,
            Quiz.id.not_in(list(seen_quiz_ids) if seen_quiz_ids else [-1])
        ).limit(20)
    )
    discover_quizzes = []
    for row in discover_res.all():
        q, count = row
        discover_quizzes.append({
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "cover_image": q.cover_image,
            "questions_count": count or 0,
            "cards_count": count or 0,
            "tags": [t.name for t in getattr(q, 'tags', [])],
            "creator_id": q.creator_id,
            "creator_name": creator_map.get(q.creator_id, "System"),
            "is_creator": False,
            "is_public": True,
            "practice_settings": q.practice_settings or {},
            "has_roadmap": False,
            "learned_count": 0,
            "mastered_count": 0,
            "progress_percent": 0,
            "last_studied_at": None,
            "created_at": q.created_at.isoformat() if q.created_at else None
        })

    # Stats and Gamification
    gamify_data = await GamificationInterface.get_user_stats(db, user_id_int)
    stats_summary = await StatsInterface.get_user_summary(db, user_id_int)

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        },
        "my_quizzes": my_quizzes,
        "archived_quizzes": archived_quizzes,
        "discover_quizzes": discover_quizzes,
        "created_quizzes": [q for q in my_quizzes if q.get("is_creator")],
        "gamify": gamify_data,
        "stats_summary": stats_summary
    }

