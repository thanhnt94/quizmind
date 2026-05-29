import asyncio
import traceback
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.modules.auth.models import User
from app.modules.quiz.models import UserGlobalGoal
from app.modules.stats.models import UserDailyStats
from datetime import datetime

async def test_get_global_goals():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        user_id = 1
        try:
            # Get or create user global goals
            res = await db.execute(select(UserGlobalGoal).filter(UserGlobalGoal.user_id == user_id))
            goal = res.scalar_one_or_none()
            if not goal:
                print("Goal not found, creating...")
                goal = UserGlobalGoal(user_id=user_id, daily_time_target=20, daily_card_target=20)
                db.add(goal)
                await db.commit()
                await db.refresh(goal)
                
            # Get today's stats (time and cards studied)
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            stats_res = await db.execute(
                select(UserDailyStats).where(
                    UserDailyStats.user_id == user_id,
                    UserDailyStats.date >= today
                )
            )
            stats = stats_res.scalar_one_or_none()
            
            actual_seconds = stats.total_time_seconds if stats else 0
            actual_minutes = round(actual_seconds / 60, 1)
            actual_cards = stats.questions_attempted if stats else 0
            
            print("Successfully retrieved goals:")
            print(f"daily_time_target: {goal.daily_time_target}")
            print(f"daily_card_target: {goal.daily_card_target}")
            print(f"actual_time_minutes: {actual_minutes}")
            print(f"actual_cards_completed: {actual_cards}")
            
        except Exception as e:
            print("EXCEPTION CAUGHT:")
            traceback.print_exc()

if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    asyncio.run(test_get_global_goals())
