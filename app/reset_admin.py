import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.auth.services.auth_service import AuthService
from sqlalchemy import select

async def reset_quizmind_admin():
    async with SessionLocal() as db:
        print("Checking for QuizMind admin user...")
        result = await db.execute(select(User).where(User.username == "admin"))
        admin = result.scalar_one_or_none()
        
        if admin:
            print(f"Found admin: {admin.username}. Resetting password to 'admin'...")
            admin.hashed_password = AuthService.get_password_hash("admin")
            await db.commit()
            print("QuizMind Admin Password reset successfully.")
        else:
            print("Admin user not found. Creating...")
            admin = User(
                username="admin",
                email="admin@quizmind.com",
                full_name="QuizMind Admin",
                hashed_password=AuthService.get_password_hash("admin"),
                role="admin"
            )
            db.add(admin)
            await db.commit()
            print("QuizMind Admin user created successfully.")

if __name__ == "__main__":
    asyncio.run(reset_quizmind_admin())
