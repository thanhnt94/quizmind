from sqlalchemy import Column, Integer, Float, DateTime, String
from app.core.db import Base
from datetime import datetime

class UserDailyStats(Base):
    __tablename__ = "user_daily_stats"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, index=True)
    date = Column(DateTime, default=datetime.utcnow)
    questions_attempted = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    total_time_seconds = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)
