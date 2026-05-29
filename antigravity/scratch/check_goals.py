import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.modules.quiz.models import UserGlobalGoal
from app.modules.auth.models import User
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Check users
        user_res = await db.execute(select(User))
        users = user_res.scalars().all()
        print("Users in database:")
        for u in users:
            print(f"- ID: {u.id}, Username: {u.username}, Email: {u.email}")
            
        # Check global goals
        goal_res = await db.execute(select(UserGlobalGoal))
        goals = goal_res.scalars().all()
        print("\nGlobal Goals in database:")
        for g in goals:
            print(f"- UserID: {g.user_id}, TimeTarget: {g.daily_time_target}, CardTarget: {g.daily_card_target}")

if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    asyncio.run(main())
