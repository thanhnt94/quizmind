from sqlalchemy import Column, Integer, String, Boolean, DateTime
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
