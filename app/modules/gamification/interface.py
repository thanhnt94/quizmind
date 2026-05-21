from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from .models import UserGamification, UserDailyActivity
from datetime import datetime, timedelta, date
from typing import Optional

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
    async def update_streak(db: AsyncSession, user_id: int, local_date_str: Optional[str] = None):
        # 1. Parse local_date_str or fall back to UTC date
        activity_date = None
        if local_date_str:
            try:
                activity_date = date.fromisoformat(local_date_str)
            except ValueError:
                pass
        if not activity_date:
            activity_date = datetime.utcnow().date()
            
        # 2. Get UserGamification stats
        result = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
        user_stats = result.scalar_one_or_none()
        if not user_stats:
            user_stats = UserGamification(user_id=user_id, streak_count=0)
            db.add(user_stats)
            await db.flush()

        # 3. Check if UserDailyActivity for today already exists
        act_res = await db.execute(
            select(UserDailyActivity).where(
                and_(
                    UserDailyActivity.user_id == user_id,
                    UserDailyActivity.activity_date == activity_date
                )
            )
        )
        existing_act = act_res.scalar_one_or_none()
        
        if existing_act:
            # Already active today, streak is maintained. Just return it.
            return user_stats.streak_count

        # 4. If not active today, record new daily activity
        new_act = UserDailyActivity(user_id=user_id, activity_date=activity_date)
        db.add(new_act)

        # 5. Check if yesterday had an activity to continue the streak
        yesterday = activity_date - timedelta(days=1)
        yest_res = await db.execute(
            select(UserDailyActivity).where(
                and_(
                    UserDailyActivity.user_id == user_id,
                    UserDailyActivity.activity_date == yesterday
                )
            )
        )
        existing_yest = yest_res.scalar_one_or_none()

        if existing_yest:
            user_stats.streak_count += 1
        else:
            # If yesterday was empty, we check if there's a gap. Streak resets to 1.
            user_stats.streak_count = 1

        user_stats.last_activity = datetime.utcnow()
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

