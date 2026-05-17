from app.modules.quiz.models import Category, Quiz, Question, Option
from app.modules.auth.models import User
from app.modules.gamification.models import UserGamification, Badge
from app.modules.notification.models import Notification
from app.modules.stats.models import UserDailyStats
from app.modules.admin.models import SystemConfig, AdminLog
from app.modules.sso_module.models import SSOConfig
from app.modules.auth.services.auth_service import AuthService
from app.core.db import engine, Base, SessionLocal
from sqlalchemy import select
import asyncio

async def init_db():
    # Ensure tables are created
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with SessionLocal() as db:
        # Check if category exists
        result = await db.execute(select(Category))
        if not result.scalar():
            cat = Category(name="General", description="Default category")
            db.add(cat)
            await db.commit()
            print("Default category created.")

        # Check if admin exists
        result = await db.execute(select(User).where(User.username == "admin"))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(
                username="admin",
                email="admin@quizmind.com",
                full_name="QuizMind Admin",
                hashed_password=AuthService.get_password_hash("admin"),
                role="admin"
            )
            db.add(admin)
            await db.commit()
            print("Default admin user created (admin / admin).")

        # Seed SSO Config for testing
        result = await db.execute(select(SSOConfig))
        if not result.scalar():
            sso_cfg = SSOConfig(
                is_enabled=True,
                server_url="http://localhost:5000",
                client_id="quizmind-v1",
                client_secret="quizmind_secret_123"
            )
            db.add(sso_cfg)
            await db.commit()
            print("Default SSO configuration seeded.")

if __name__ == "__main__":
    asyncio.run(init_db())
