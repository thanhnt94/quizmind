import logging
import asyncio
from telegram import Bot
from telegram.ext import Application, CommandHandler
from sqlalchemy import select
from app.core.db import SessionLocal
from app.modules.admin.models import SystemConfig

logger = logging.getLogger(__name__)

_bot_app = None
bot = None

async def get_bot_token():
    async with SessionLocal() as db:
        res = await db.execute(select(SystemConfig).where(SystemConfig.id == "telegram_bot_config"))
        config = res.scalar_one_or_none()
        if config and config.value:
            return config.value.get("bot_token")
    return None

async def stop_bot_app():
    global _bot_app, bot
    if _bot_app:
        try:
            if _bot_app.updater:
                await _bot_app.updater.stop()
            await _bot_app.stop()
            await _bot_app.shutdown()
            logger.info("Telegram Bot stopped.")
        except Exception as e:
            logger.error(f"Error stopping bot: {e}")
        finally:
            _bot_app = None
            bot = None

async def init_bot_app():
    global _bot_app, bot
    if _bot_app:
        await stop_bot_app()

    token = await get_bot_token()
    if not token:
        logger.warning("Telegram Bot Token not configured. Polling disabled.")
        return None

    try:
        # Xóa webhook trước khi polling
        _temp_bot = Bot(token=token)
        await _temp_bot.delete_webhook(drop_pending_updates=True)
        
        app = Application.builder().token(token).build()
        bot = app.bot
        
        from app.modules.notification.services.telegram_handlers import handle_start
        app.add_handler(CommandHandler("start", handle_start))
        
        await app.initialize()
        await app.start()
        await app.updater.start_polling(poll_interval=60.0)
        
        _bot_app = app
        logger.info("Telegram Bot Application initialized with POLLING.")
        return app
    except Exception as e:
        logger.error(f"Failed to initialize Telegram Bot polling: {e}")
        return None
