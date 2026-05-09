from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .models import UserGamification
from datetime import datetime, timedelta

class GamificationInterface:
    @staticmethod
    async def add_xp(db: AsyncSession, user_id: int, amount: int):
        result = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
        user_stats = result.scalar_one_or_none()
        if not user_stats:
            user_stats = UserGamification(user_id=user_id, xp=0, level=1)
            db.add(user_stats)
        
        user_stats.xp += amount
        # Simple level up logic: each level is 1000 XP
        new_level = (user_stats.xp // 1000) + 1
        level_up = new_level > user_stats.level
        user_stats.level = new_level
        
        await db.commit()
        return {"level_up": level_up, "current_level": user_stats.level, "current_xp": user_stats.xp}

    @staticmethod
    async def update_streak(db: AsyncSession, user_id: int):
        result = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
        user_stats = result.scalar_one_or_none()
        if not user_stats:
            user_stats = UserGamification(user_id=user_id)
            db.add(user_stats)
        
        now = datetime.utcnow()
        if user_stats.last_activity:
            diff = now.date() - user_stats.last_activity.date()
            if diff == timedelta(days=1):
                user_stats.streak_count += 1
            elif diff > timedelta(days=1):
                user_stats.streak_count = 1
        else:
            user_stats.streak_count = 1
            
        user_stats.last_activity = now
        await db.commit()
        return user_stats.streak_count

    @staticmethod
    async def get_user_stats(db: AsyncSession, user_id: int):
        result = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
        stats = result.scalar_one_or_none()
        if not stats:
            return {"xp": 0, "level": 1, "streak": 0, "badges": []}
        return {
            "xp": stats.xp,
            "level": stats.level,
            "streak": stats.streak_count,
            "badges": stats.badges
        }
