from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.db import get_db
from app.modules.notification.services.push_service import PushService

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.post("/read-all")
async def mark_notifications_read(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.notification.models import Notification
    user_id = int(request.cookies.get("user_id", 1))
    await db.execute(
        Notification.__table__.update().where(Notification.user_id == user_id).values(is_read=True)
    )
    await db.commit()
    return {"status": "ok"}

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    try:
        pub_key = PushService.get_public_key()
        return {"public_key": pub_key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load VAPID key: {str(e)}")

@router.post("/push/subscribe")
async def subscribe_push(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.notification.models import PushSubscription
    user_id = int(request.cookies.get("user_id", 1))
    
    endpoint = data.get("endpoint")
    keys = data.get("keys", {})
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")
    
    if not endpoint or not p256dh or not auth:
        raise HTTPException(status_code=400, detail="Invalid subscription data")
        
    # Check if subscription already exists
    res = await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == endpoint)
    )
    sub = res.scalar_one_or_none()
    
    if sub:
        sub.user_id = user_id
        sub.p256dh = p256dh
        sub.auth = auth
    else:
        sub = PushSubscription(
            user_id=user_id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth
        )
        db.add(sub)
        
    await db.commit()
    return {"status": "success", "message": "Subscribed to push notifications"}

@router.post("/push/unsubscribe")
async def unsubscribe_push(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.notification.models import PushSubscription
    user_id = int(request.cookies.get("user_id", 1))
    endpoint = data.get("endpoint")
    
    if endpoint:
        stmt = delete(PushSubscription).where(
            PushSubscription.user_id == user_id,
            PushSubscription.endpoint == endpoint
        )
    else:
        stmt = delete(PushSubscription).where(PushSubscription.user_id == user_id)
        
    await db.execute(stmt)
    await db.commit()
    return {"status": "success", "message": "Unsubscribed from push notifications"}

import secrets

@router.get("/telegram/config")
async def get_telegram_config(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.notification.models import UserTelegramConfig
    from app.modules.notification.services.telegram_service import TelegramService
    user_id = int(request.cookies.get("user_id", 1))
    
    bot_config = await TelegramService.get_bot_config(db)
    
    res = await db.execute(select(UserTelegramConfig).where(UserTelegramConfig.user_id == user_id))
    config = res.scalar_one_or_none()
    
    if not config:
        config = UserTelegramConfig(
            user_id=user_id,
            connect_token=secrets.token_hex(6).upper()
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
        
    return {
        "is_linked": bool(config.telegram_chat_id),
        "connect_token": config.connect_token,
        "reminder_time": config.reminder_time,
        "is_active": config.is_active,
        "streak_guard_enabled": config.streak_guard_enabled,
        "weekly_summary_enabled": config.weekly_summary_enabled,
        "inactivity_alert_enabled": config.inactivity_alert_enabled,
        "bot_username": bot_config.get("bot_username", "QuizMindBot")
    }

@router.post("/telegram/config")
async def update_telegram_config(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.notification.models import UserTelegramConfig
    user_id = int(request.cookies.get("user_id", 1))
    
    res = await db.execute(select(UserTelegramConfig).where(UserTelegramConfig.user_id == user_id))
    config = res.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
        
    if "reminder_time" in data:
        config.reminder_time = data["reminder_time"]
    if "is_active" in data:
        config.is_active = data["is_active"]
    if "streak_guard_enabled" in data:
        config.streak_guard_enabled = data["streak_guard_enabled"]
    if "weekly_summary_enabled" in data:
        config.weekly_summary_enabled = data["weekly_summary_enabled"]
    if "inactivity_alert_enabled" in data:
        config.inactivity_alert_enabled = data["inactivity_alert_enabled"]
    if data.get("unlink") is True:
        config.telegram_chat_id = None
        config.connect_token = secrets.token_hex(6).upper() # reset token
        
    await db.commit()
    return {"status": "success"}

