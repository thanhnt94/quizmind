from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255), nullable=True) # Null if only SSO
    full_name = Column(String(255))
    role = Column(String(50), default="user") # admin, user
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # SSO related
    sso_id = Column(String(255), unique=True, index=True, nullable=True)


class UserGlobalSettings(Base):
    __tablename__ = "user_global_settings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True, nullable=False)
    
    # UI Theme & System Preferences
    theme = Column(String(20), default="light") # 'light' | 'dark'
    focus_timer_active = Column(Boolean, default=True)
    sfx_enabled = Column(Boolean, default=True)
    haptic_enabled = Column(Boolean, default=True)
    autoplay_audio = Column(String(20), default="never") # 'never' | 'always' | 'question'
    
    # Session & Quiz Modes
    quiz_learning_mode = Column(String(50), default="mcq") # 'mcq' | 'missed' | 'new' | 'typing' | 'listening' | 'exam'
    practice_range = Column(String(20), default="all") # 'all' | 'missed' | 'new'
    score_mode = Column(String(20), default="all") # 'today' | 'all'
    time_mode = Column(String(20), default="question") # 'question' | 'today' | 'all'
    last_quiz_id = Column(Integer, nullable=True)
    
    # Home & Dashboard Display Preferences
    home_active_tab = Column(String(20), default="roadmap") # 'roadmap' | 'quizzes'
    roadmap_quiz_order = Column(JSON, nullable=True, default=list)
    quizzes_quiz_order = Column(JSON, nullable=True, default=list)
    
    # Quiz Specific Preferences
    shuffle_choices = Column(Boolean, default=True)
    shuffle_questions = Column(Boolean, default=True)
    auto_expand_explanation = Column(Boolean, default=True)
    exam_batch_size = Column(Integer, default=10)
    instant_feedback = Column(Boolean, default=True)
    font_size = Column(String(20), default="100%") # '85%' | '100%' | '115%' | '130%'
    auto_advance = Column(String(20), default="off") # 'off' | '1s' | '2s' | '3s'
    show_mastery = Column(Boolean, default=True)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User")

