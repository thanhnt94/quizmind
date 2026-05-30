from sqlalchemy import Column, Integer, String, DateTime, Boolean
from app.core.db import Base
from datetime import datetime

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, index=True)
    title = Column(String(100))
    message = Column(String(255))
    type = Column(String(50)) # 'level_up', 'badge', 'system', 'streak'
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserTelegramConfig(Base):
    __tablename__ = "user_telegram_configs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, unique=True, index=True)
    telegram_chat_id = Column(String(100), nullable=True)
    connect_token = Column(String(100), unique=True, index=True)
    is_active = Column(Boolean, default=False)
    reminder_time = Column(String(10), default="20:00")
    streak_guard_enabled = Column(Boolean, default=True)
    weekly_summary_enabled = Column(Boolean, default=True)
    inactivity_alert_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
