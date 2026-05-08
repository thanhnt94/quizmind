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
