from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.db import get_db
from app.modules.auth.services.auth_service import AuthService
from app.modules.stats.services.analytics_service import AnalyticsService

router = APIRouter(tags=["Gamification"])

@router.get("/gamification/leaderboard")
async def get_gamification_leaderboard(request: Request, time_filter: str = "all_time", db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_leaderboard(db, user.id, time_filter)
    except Exception as e:
        return {"error": str(e)}

@router.get("/gamification/badges/progress")
async def get_badges_progress(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.gamification.models import Badge, UserGamification
    from app.modules.quiz.models import UserQuestionMastery, UserAnswer, QuizAttempt
    
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = user.id
    
    # Fetch user gamification stats
    res = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
    user_stats = res.scalar_one_or_none()
    if not user_stats:
        user_stats = UserGamification(user_id=user_id, xp=0, level=1, streak_count=0, badges=[])
        
    earned_badge_ids = set(user_stats.badges or [])
    
    # Fetch all badges
    res_badges = await db.execute(select(Badge))
    all_badges = res_badges.scalars().all()
    
    current_xp = user_stats.xp
    current_streak = user_stats.streak_count
    
    # mastery: count how many cards are box_level == 5 (mastered)
    mastered_res = await db.execute(
        select(func.count(UserQuestionMastery.id)).where(
            UserQuestionMastery.user_id == user_id,
            UserQuestionMastery.box_level == 5
        )
    )
    current_mastery = mastered_res.scalar() or 0
    
    # goals crusher: count times is_target_met was True in UserDailyProgress
    from app.modules.quiz.models import UserDailyProgress
    goals_res = await db.execute(
        select(func.count(UserDailyProgress.id)).where(
            UserDailyProgress.goal.has(user_id=user_id),
            UserDailyProgress.is_target_met == True
        )
    )
    current_goals = goals_res.scalar() or 0
    
    unearned_progress = []
    for badge in all_badges:
        if badge.id in earned_badge_ids:
            continue
            
        target = badge.criteria_value or 1
        current = 0
        
        if badge.criteria_type == 'xp':
            current = current_xp
        elif badge.criteria_type == 'streak':
            current = current_streak
        elif badge.criteria_type == 'mastery':
            current = current_mastery
        elif badge.criteria_type == 'goals':
            current = current_goals
        elif badge.id == "first_steps":
            ans_res = await db.execute(
                select(func.count(UserAnswer.id)).join(QuizAttempt).where(QuizAttempt.user_id == user_id)
            )
            current = ans_res.scalar() or 0
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
            current = fast_res.scalar() or 0
        else:
            current = 0
            
        percentage = min(100.0, (current / target) * 100.0) if target > 0 else 0.0
        
        unearned_progress.append({
            "id": badge.id,
            "name": badge.name,
            "description": badge.description,
            "icon": badge.icon,
            "criteria_type": badge.criteria_type,
            "target_value": target,
            "current_value": current,
            "percentage": round(percentage, 1)
        })
        
    unearned_progress.sort(key=lambda x: x["percentage"], reverse=True)
    return unearned_progress[:3]
