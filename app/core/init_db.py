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
                email="admin@mindstack.click",
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

        # Seed Default Achievements/Badges
        result = await db.execute(select(Badge))
        if not result.scalar():
            default_badges = [
                Badge(
                    id="first_steps",
                    name="First Steps",
                    description="Solve your first question in any quiz",
                    icon="Zap",
                    criteria_type="xp",
                    criteria_value=1
                ),
                Badge(
                    id="streak_starter",
                    name="Streak Starter",
                    description="Reach a 3-day learning streak",
                    icon="Flame",
                    criteria_type="streak",
                    criteria_value=3
                ),
                Badge(
                    id="streak_legend",
                    name="Streak Legend",
                    description="Reach a 7-day learning streak",
                    icon="Award",
                    criteria_type="streak",
                    criteria_value=7
                ),
                Badge(
                    id="perfect_score",
                    name="Perfect Score",
                    description="Score 100% accuracy on a quiz of at least 5 questions",
                    icon="CheckCircle2",
                    criteria_type="accuracy",
                    criteria_value=100
                ),
                Badge(
                    id="speed_demon",
                    name="Speed Demon",
                    description="Answer 5 questions under 5 seconds each",
                    icon="Activity",
                    criteria_type="speed",
                    criteria_value=5
                ),
                Badge(
                    id="goal_crusher",
                    name="Goal Crusher",
                    description="Reach your daily goal 3 times",
                    icon="Target",
                    criteria_type="goals",
                    criteria_value=3
                ),
                Badge(
                    id="card_master",
                    name="Card Master",
                    description="Elevate 10 cards to 'Mastered' level",
                    icon="Trophy",
                    criteria_type="mastery",
                    criteria_value=10
                )
            ]
            db.add_all(default_badges)
            await db.commit()
            print("Default achievements seeded.")


if __name__ == "__main__":
    asyncio.run(init_db())
