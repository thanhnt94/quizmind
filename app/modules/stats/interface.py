from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from .models import UserDailyStats
from datetime import datetime

class StatsInterface:
    @staticmethod
    async def record_activity(db: AsyncSession, user_id: int, is_correct: bool, time_spent: int):
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        result = await db.execute(
            select(UserDailyStats).where(
                UserDailyStats.user_id == user_id,
                UserDailyStats.date >= today
            )
        )
        stats = result.scalar_one_or_none()
        
        if not stats:
            stats = UserDailyStats(
                user_id=user_id,
                date=today,
                questions_attempted=0,
                correct_answers=0,
                total_time_seconds=0,
                accuracy=0.0
            )
            db.add(stats)
        
        stats.questions_attempted = (stats.questions_attempted or 0) + 1
        if is_correct:
            stats.correct_answers = (stats.correct_answers or 0) + 1
        else:
            stats.correct_answers = stats.correct_answers or 0
        
        stats.total_time_seconds = (stats.total_time_seconds or 0) + time_spent
        
        correct_cnt = stats.correct_answers or 0
        attempted_cnt = stats.questions_attempted or 1
        stats.accuracy = (correct_cnt / attempted_cnt) * 100
        
        await db.commit()
        return stats

    @staticmethod
    async def get_user_summary(db: AsyncSession, user_id: int):
        # Aggregate all-time stats
        result = await db.execute(
            select(
                func.sum(UserDailyStats.questions_attempted).label("total_questions"),
                func.avg(UserDailyStats.accuracy).label("avg_accuracy"),
                func.sum(UserDailyStats.total_time_seconds).label("total_time")
            ).where(UserDailyStats.user_id == user_id)
        )
        summary = result.first()
        
        return {
            "total_questions": summary.total_questions or 0,
            "avg_accuracy": round(summary.avg_accuracy or 0, 1),
            "total_time_hours": round((summary.total_time or 0) / 3600, 1)
        }
