from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from .models import Notification

class NotificationInterface:
    @staticmethod
    async def send(db: AsyncSession, user_id: int, title: str, message: str, n_type: str = "system"):
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=n_type
        )
        db.add(notification)
        await db.commit()
        return notification

    @staticmethod
    async def get_unread_count(db: AsyncSession, user_id: int):
        result = await db.execute(
            select(func.count(Notification.id)).where(Notification.user_id == user_id, Notification.is_read == False)
        )
        return result.scalar() or 0

    @staticmethod
    async def get_latest(db: AsyncSession, user_id: int, limit: int = 5):
        result = await db.execute(
            select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc()).limit(limit)
        )
        return result.scalars().all()
