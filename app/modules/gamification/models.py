from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Date
from sqlalchemy.orm import relationship
from app.core.db import Base
from datetime import datetime

class UserGamification(Base):
    __tablename__ = "user_gamification"
    
    user_id = Column(Integer, primary_key=True)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    streak_count = Column(Integer, default=0)
    last_activity = Column(DateTime, default=datetime.utcnow)
    badges = Column(JSON, default=list) # List of badge IDs earned

class Badge(Base):
    __tablename__ = "badges"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(100))
    description = Column(String(255))
    icon = Column(String(50)) # Lucide icon name
    criteria_type = Column(String(50)) # 'xp', 'streak', 'accuracy'
    criteria_value = Column(Integer)

class UserDailyActivity(Base):
    __tablename__ = "user_daily_activities"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    activity_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

