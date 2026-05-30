import logging
from telegram import Update
from telegram.ext import ContextTypes
from sqlalchemy import select
from app.core.db import SessionLocal
from app.modules.notification.models import UserTelegramConfig
from app.modules.notification.services.telegram_service import TelegramService

logger = logging.getLogger(__name__)

async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    text = update.message.text
    
    parts = text.split(" ")
    if len(parts) > 1:
        token = parts[1].strip().upper()
        async with SessionLocal() as db:
            res = await db.execute(select(UserTelegramConfig).where(UserTelegramConfig.connect_token == token))
            config = res.scalar_one_or_none()
            
            if config:
                config.telegram_chat_id = str(chat_id)
                await db.commit()
                await context.bot.send_message(
                    chat_id=chat_id,
                    text="🎉 <b>Liên kết thành công!</b>\nTừ giờ mình sẽ nhắc nhở bạn làm bài quiz mỗi ngày trên QuizMind nhé!",
                    parse_mode="HTML"
                )
            else:
                await context.bot.send_message(chat_id=chat_id, text="❌ Mã liên kết không hợp lệ hoặc đã hết hạn.")
    else:
        await context.bot.send_message(
            chat_id=chat_id,
            text="👋 Chào mừng bạn đến với <b>QuizMind Bot</b>!\nVui lòng nhấp vào nút 'Liên kết Telegram' trên web để bắt đầu.",
            parse_mode="HTML"
        )
