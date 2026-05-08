import hashlib
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.auth.models import User
from typing import Optional

class AuthService:
    @staticmethod
    def verify_password(plain_password, hashed_password):
        # Simple SHA256 for fallback compatibility
        return AuthService.get_password_hash(plain_password) == hashed_password

    @staticmethod
    def get_password_hash(password):
        return hashlib.sha256(password.encode()).hexdigest()

    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str):
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str):
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @staticmethod
    async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional[User]:
        user = await AuthService.get_user_by_username(db, username)
        if not user or not user.hashed_password:
            return None
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        return user
