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
        # Also check alternative ID
        res2 = await db.execute(select(SystemConfig).where(SystemConfig.id == "telegram_config"))
        config2 = res2.scalar_one_or_none()
        if config2 and config2.value:
            return config2.value
        return {"bot_username": "inmind_auth_bot"}

    @staticmethod
    async def send_message(db: AsyncSession, chat_id: str, text: str, message_type: str = "study_reminder", variables: dict = None):
        # Delegate to CentralAuth proxy
        from app.modules.sso_module.service import SSOService
        from app.core.config import settings
        
        queue_token = getattr(settings, "CENTRALAUTH_QUEUE_TOKEN", getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123"))
        auth_url = getattr(settings, "CENTRALAUTH_INTERNAL_URL", None) or settings.CENTRAL_AUTH_URL
        try:
            sso_config = await SSOService.get_config(db)
            if sso_config.is_enabled and sso_config.server_url:
                auth_url = sso_config.server_url
        except Exception:
            pass

        try:
            logger.info(f"[TelegramService] Delegating send_message to CentralAuth ({auth_url}) for chat {chat_id}")
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{auth_url.rstrip('/')}/api/queue/telegram/send-message",
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "source": "quizmind",
                        "message_type": message_type,
                        "variables": variables or {}
                    },
                    headers={"X-Queue-Token": queue_token},
                    timeout=15.0
                )
                if response.status_code == 200:
                    return True
                logger.error(f"[TelegramService] CentralAuth returned status {response.status_code}: {response.text}")
                return False
        except Exception as sso_err:
            logger.warning(f"[TelegramService] CentralAuth proxy send failed: {sso_err}")

        # Fallback to local bot if running
        from app.modules.notification.services.bot_service import bot
        if bot:
            try:
                await bot.send_message(chat_id=chat_id, text=text, parse_mode="HTML")
                return True
            except Exception as e:
                logger.error(f"Failed to send telegram message to {chat_id}: {e}")
                return False

        logger.warning("[TelegramService] No bot available to send message.")
        return False
