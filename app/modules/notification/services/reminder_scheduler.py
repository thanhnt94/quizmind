import asyncio
import logging
from datetime import datetime
from sqlalchemy import select
from app.core.db import SessionLocal
from app.modules.notification.models import PushSubscription
from app.modules.notification.services.push_service import PushService
from app.modules.quiz.services.quiz_service import QuizService

logger = logging.getLogger(__name__)

async def check_and_send_reminders_for_minute(current_time_str: str):
    logger.info(f"[SCHEDULER] Checking reminders for time {current_time_str}...")
    from app.modules.notification.models import UserTelegramConfig
    from app.modules.notification.services.telegram_service import TelegramService
    
    async with SessionLocal() as db:
        # Get users whose reminder time is now and is active
        res = await db.execute(
            select(UserTelegramConfig).where(
                UserTelegramConfig.reminder_time == current_time_str,
                UserTelegramConfig.is_active == True
            )
        )
        configs = res.scalars().all()
        
        for config in configs:
            try:
                user_id = config.user_id
                
                # Query if they have due cards today
                review_data = await QuizService.get_today_review(db, user_id)
                due_count = review_data.get("due_cards_count", 0)
                streak_at_risk = review_data.get("streak_at_risk", False)
                
                if due_count > 0:
                    title = "🎯 Đến giờ làm bài quiz rồi! (QuizMind)"
                    body = f"Bạn còn {due_count} thẻ đang chờ ôn tập hôm nay. Hãy hoàn thành ngay để duy trì chuỗi học nhé!"
                    
                    # 1. Send Telegram if linked
                    if config.telegram_chat_id:
                        await TelegramService.send_message(
                            db,
                            config.telegram_chat_id,
                            f"<b>{title}</b>\n{body}\n\n<a href='http://localhost:5173/dashboard'>👉 Bắt đầu làm ngay</a>"
                        )
                        
                    # 2. Send Web Push
                    push_res = await db.execute(select(PushSubscription).where(PushSubscription.user_id == user_id))
                    subs = push_res.scalars().all()
                    for sub in subs:
                        await PushService.send_push(db, sub, title, body, "/dashboard")
                        
            except Exception as e:
                logger.error(f"[SCHEDULER] Error processing reminder for user {config.user_id}: {e}")

async def check_advanced_reminders_for_minute(current_time_str: str, now: datetime):
    from app.modules.notification.models import UserTelegramConfig
    from app.modules.notification.services.telegram_service import TelegramService
    
    async with SessionLocal() as db:
        # 1. Streak Guard: runs at 22:00
        if current_time_str == "22:00":
            res = await db.execute(select(UserTelegramConfig).where(
                UserTelegramConfig.streak_guard_enabled == True,
                UserTelegramConfig.is_active == True
            ))
            configs = res.scalars().all()
            for config in configs:
                if not config.telegram_chat_id: continue
                try:
                    review_data = await QuizService.get_today_review(db, config.user_id)
                    if review_data.get("streak_at_risk", False) or review_data.get("due_cards_count", 0) > 0:
                        title = "🚨 BÁO ĐỘNG ĐỎ: NGUY CƠ MẤT STREAK! 🚨"
                        body = "Chỉ còn 2 tiếng nữa là hết ngày! Bạn chưa hoàn thành mục tiêu học. Vào cứu lấy chuỗi học ngay nào!"
                        await TelegramService.send_message(db, config.telegram_chat_id, f"<b>{title}</b>\n{body}\n\n<a href='http://localhost:5173/dashboard'>👉 Cứu Streak Ngay</a>")
                except Exception as e:
                    logger.error(f"[SCHEDULER] Error processing streak guard for user {config.user_id}: {e}")

        # 2. Weekly Summary: runs at 09:00 on Sunday (weekday == 6)
        if current_time_str == "09:00" and now.weekday() == 6:
            res = await db.execute(select(UserTelegramConfig).where(
                UserTelegramConfig.weekly_summary_enabled == True,
                UserTelegramConfig.is_active == True
            ))
            configs = res.scalars().all()
            for config in configs:
                if not config.telegram_chat_id: continue
                try:
                    title = "📊 BÁO CÁO TIẾN ĐỘ TUẦN (QUIZMIND)"
                    body = "Chúc mừng bạn đã hoàn thành một tuần học tập chăm chỉ! Hãy tiếp tục duy trì ngọn lửa đam mê trong tuần mới nhé!"
                    await TelegramService.send_message(db, config.telegram_chat_id, f"<b>{title}</b>\n{body}\n\n<a href='http://localhost:5173/dashboard'>👉 Xem thống kê chi tiết</a>")
                except Exception as e:
                    logger.error(f"[SCHEDULER] Error processing weekly summary for user {config.user_id}: {e}")
                    
        # 3. Inactivity Alert: runs at 10:00
        if current_time_str == "10:00":
            res = await db.execute(select(UserTelegramConfig).where(
                UserTelegramConfig.inactivity_alert_enabled == True,
                UserTelegramConfig.is_active == True
            ))
            configs = res.scalars().all()
            for config in configs:
                if not config.telegram_chat_id: continue
                # In a complete implementation we would query the user's last study date.
                # For this iteration we add the infrastructure to hook into this time.
                pass

async def scheduler_loop():
    logger.info("[SCHEDULER] Reminder scheduler loop started. Checking every minute.")
    while True:
        try:
            now = datetime.now()
            current_time_str = now.strftime("%H:%M")
            await check_and_send_reminders_for_minute(current_time_str)
            await check_advanced_reminders_for_minute(current_time_str, now)
            
            # Sleep until the start of the next minute
            seconds_to_next_minute = 60 - now.second
            await asyncio.sleep(seconds_to_next_minute)
        except asyncio.CancelledError:
            logger.info("[SCHEDULER] Scheduler loop task cancelled.")
            break
        except Exception as e:
            logger.error(f"[SCHEDULER] Error in scheduler loop: {e}")
            await asyncio.sleep(60)


def start_scheduler():
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.get_event_loop()
    task = loop.create_task(scheduler_loop())
    return task
