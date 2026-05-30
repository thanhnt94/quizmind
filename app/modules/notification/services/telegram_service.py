import os
import httpx
import logging

logger = logging.getLogger(__name__)

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.admin.models import SystemConfig

class TelegramService:
    @staticmethod
    async def get_bot_config(db: AsyncSession):
        res = await db.execute(select(SystemConfig).where(SystemConfig.id == "telegram_bot_config"))
        config = res.scalar_one_or_none()
        if config and config.value:
            return config.value
        return {}

    @staticmethod
    async def send_message(db: AsyncSession, chat_id: str, text: str):
        from app.modules.notification.services.bot_service import bot
        if not bot:
            logger.warning("Telegram Bot is not running. Cannot send message.")
            return False
            
        try:
            await bot.send_message(chat_id=chat_id, text=text, parse_mode="HTML")
            return True
        except Exception as e:
            logger.error(f"Failed to send telegram message to {chat_id}: {e}")
            return False
