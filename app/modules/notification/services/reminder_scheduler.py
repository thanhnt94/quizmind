import asyncio
import logging
from datetime import datetime
from sqlalchemy import select
from app.core.db import SessionLocal
from app.modules.notification.models import PushSubscription
from app.modules.notification.services.push_service import PushService
from app.modules.quiz.services.quiz_service import QuizService

logger = logging.getLogger(__name__)

async def _get_active_configs(db) -> list:
    from app.modules.sso_module.service import SSOService
    from app.modules.auth.models import User
    
    try:
        sso_config = await SSOService.get_config(db)
        if sso_config.is_enabled and sso_config.server_url:
            import httpx
            from app.core.config import settings
            queue_token = getattr(settings, "CENTRALAUTH_QUEUE_TOKEN", getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123"))
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{sso_config.server_url.rstrip('/')}/api/queue/telegram/configs",
                    headers={"X-Queue-Token": queue_token},
                    timeout=15.0
                )
                if response.status_code == 200:
                    remote_configs = response.json()
                    sso_ids = [str(rc.get("user_id")) for rc in remote_configs if rc.get("user_id")]
                    resolved = []
                    if sso_ids:
                        user_res = await db.execute(select(User).where(User.sso_id.in_(sso_ids)))
                        user_map = {u.sso_id: u.id for u in user_res.scalars().all()}
                        for rc in remote_configs:
                            sso_id = str(rc.get("user_id"))
                            if sso_id in user_map:
                                qm_settings = rc.get("settings", {}).get("quizmind", {})
                                resolved.append({
                                    "local_user_id": user_map[sso_id],
                                    "sso_user_id": sso_id,
                                    "telegram_chat_id": rc.get("telegram_chat_id"),
                                    "reminder_time": qm_settings.get("reminder_time", rc.get("reminder_time", "20:00")),
                                    "is_active": qm_settings.get("is_active", rc.get("is_active", True)),
                                    "streak_guard_enabled": qm_settings.get("streak_guard_enabled", rc.get("streak_guard_enabled", True)),
                                    "weekly_summary_enabled": qm_settings.get("weekly_summary_enabled", rc.get("weekly_summary_enabled", True)),
                                    "inactivity_alert_enabled": qm_settings.get("inactivity_alert_enabled", rc.get("inactivity_alert_enabled", True)),
                                })
                    return resolved
                logger.warning(f"[SCHEDULER] CentralAuth config fetch returned status {response.status_code}, fallback to local configs.")
    except Exception as sso_err:
        logger.warning(f"[SCHEDULER] Failed to fetch configs from CentralAuth, falling back to local: {sso_err}")

    # Fallback to local
    from app.modules.notification.models import UserTelegramConfig
    res = await db.execute(select(UserTelegramConfig))
    local_configs = res.scalars().all()
    return [
        {
            "local_user_id": c.user_id,
            "sso_user_id": None,
            "telegram_chat_id": c.telegram_chat_id,
            "reminder_time": c.reminder_time,
            "is_active": c.is_active,
            "streak_guard_enabled": c.streak_guard_enabled,
            "weekly_summary_enabled": c.weekly_summary_enabled,
            "inactivity_alert_enabled": c.inactivity_alert_enabled
        }
        for c in local_configs
    ]

async def check_and_send_reminders_for_minute(current_time_str: str):
    logger.info(f"[SCHEDULER] Checking reminders for time {current_time_str}...")
    from app.modules.notification.services.telegram_service import TelegramService
    from app.core.config import settings
    
    async with SessionLocal() as db:
        all_configs = await _get_active_configs(db)
        
        # Filter for active configs matching current minute
        configs = [
            c for c in all_configs
            if c.get("is_active") and c.get("reminder_time") == current_time_str
        ]
        
        for config in configs:
            try:
                user_id = config.get("local_user_id")
                if not user_id:
                    continue
                
                # Query if they have due cards today
                review_data = await QuizService.get_today_review(db, user_id)
                due_count = review_data.get("due_cards_count", 0)
                
                if due_count > 0:
                    base_url = settings.APP_BASE_URL.rstrip('/')
                    title = "🎯 Đến giờ làm bài quiz rồi! (QuizMind)"
                    body = (
                        f"<b>{title}</b>\n\n"
                        f"Bạn còn <b>{due_count}</b> câu hỏi đang chờ ôn tập hôm nay. "
                        f"Hãy hoàn thành ngay để duy trì chuỗi học nhé!\n\n"
                        f"👉 <a href='{base_url}/dashboard'>Bắt đầu làm ngay</a>"
                    )
                    
                    # 1. Send Telegram if linked
                    chat_id = config.get("telegram_chat_id")
                    if chat_id:
                        await TelegramService.send_message(
                            db,
                            chat_id,
                            body,
                            message_type="study_reminder"
                        )
                        
                    # 2. Send Web Push
                    push_res = await db.execute(select(PushSubscription).where(PushSubscription.user_id == user_id))
                    subs = push_res.scalars().all()
                    for sub in subs:
                        await PushService.send_push(
                            db,
                            sub,
                            title,
                            f"Bạn còn {due_count} câu hỏi đang chờ ôn tập hôm nay!",
                            "/dashboard"
                        )
                        
            except Exception as e:
                logger.error(f"[SCHEDULER] Error processing reminder for user {config.get('local_user_id')}: {e}")

async def check_advanced_reminders_for_minute(current_time_str: str, now: datetime):
    from app.modules.notification.services.telegram_service import TelegramService
    from app.core.config import settings
    base_url = settings.APP_BASE_URL.rstrip('/')
    
    async with SessionLocal() as db:
        all_configs = await _get_active_configs(db)
        
        # 1. Streak Guard: runs at 22:00
        if current_time_str == "22:00":
            guard_configs = [
                c for c in all_configs
                if c.get("is_active") and c.get("streak_guard_enabled") and c.get("telegram_chat_id")
            ]
            for config in guard_configs:
                try:
                    user_id = config.get("local_user_id")
                    review_data = await QuizService.get_today_review(db, user_id)
                    due_count = review_data.get("due_cards_count", 0)
                    if review_data.get("streak_at_risk", False) or due_count > 0:
                        title = "🚨 BÁO ĐỘNG ĐỎ: NGUY CƠ MẤT STREAK QUIZMIND! 🚨"
                        body = (
                            f"<b>{title}</b>\n\n"
                            f"Chỉ còn 2 tiếng nữa là hết ngày! Bạn còn <b>{due_count}</b> câu hỏi chưa hoàn thành. "
                            f"Vào cứu lấy chuỗi học ngay nào!\n\n"
                            f"👉 <a href='{base_url}/dashboard'>Cứu Streak Ngay</a>"
                        )
                        await TelegramService.send_message(
                            db,
                            config["telegram_chat_id"],
                            body,
                            message_type="streak_guard"
                        )
                except Exception as e:
                    logger.error(f"[SCHEDULER] Error processing streak guard for user {config.get('local_user_id')}: {e}")

        # 2. Weekly Summary: runs at 09:00 on Sunday (weekday == 6)
        if current_time_str == "09:00" and now.weekday() == 6:
            summary_configs = [
                c for c in all_configs
                if c.get("is_active") and c.get("weekly_summary_enabled") and c.get("telegram_chat_id")
            ]
            for config in summary_configs:
                try:
                    title = "📊 BÁO CÁO TIẾN ĐỘ TUẦN (QUIZMIND)"
                    body = (
                        f"<b>{title}</b>\n\n"
                        f"Chúc mừng bạn đã hoàn thành một tuần học tập chăm chỉ! "
                        f"Hãy tiếp tục duy trì ngọn lửa đam mê trong tuần mới nhé!\n\n"
                        f"👉 <a href='{base_url}/dashboard'>Xem thống kê chi tiết</a>"
                    )
                    await TelegramService.send_message(
                        db,
                        config["telegram_chat_id"],
                        body,
                        message_type="weekly_summary"
                    )
                except Exception as e:
                    logger.error(f"[SCHEDULER] Error processing weekly summary for user {config.get('local_user_id')}: {e}")

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
