from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.auth.models import User
from typing import Optional

class AuthService:
    @staticmethod
    def verify_password(plain_password, hashed_password):
        if not hashed_password:
            return False
        return check_password_hash(hashed_password, plain_password)

    @staticmethod
    def get_password_hash(password):
        return generate_password_hash(password)

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
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int):
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_current_user(request, db: AsyncSession) -> Optional[User]:
        user_id = request.cookies.get("user_id")
        
        # Graceful fallback to Authorization Header for pure SPA API requests
        if not user_id:
            auth_header = request.headers.get("Authorization")
            if auth_header:
                if auth_header.startswith("Bearer "):
                    user_id = auth_header.split(" ")[1]
                else:
                    user_id = auth_header.strip()
                    
        if not user_id:
            return None
        try:
            return await AuthService.get_user_by_id(db, int(user_id))
        except (ValueError, TypeError):
            return None

