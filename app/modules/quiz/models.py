from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, JSON, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.db import Base

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    quizzes = relationship("Quiz", back_populates="category")

class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), index=True)
    creator_id = Column(Integer, nullable=True) # ID of the user who created/uploaded it
    ai_prompt = Column(Text, nullable=True) # System prompt for AI generation related to this quiz
    instruction = Column(Text, nullable=True) # General instruction for the entire quiz (e.g. JLPT problem description)
    cover_image = Column(String(512), nullable=True) # URL to the cover image
    time_limit = Column(Integer, default=0) # in minutes, 0 means no limit
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    category = relationship("Category", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="quiz_tags", back_populates="quizzes")
    collaborators = relationship("QuizCollaborator", back_populates="quiz", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), index=True)
    content = Column(Text, nullable=False)
    image = Column(String(512), nullable=True)
    audio = Column(String(512), nullable=True)
    question_type = Column(String(50), default="single_choice")
    explanation = Column(Text, nullable=True)
    ai_explanation = Column(Text, nullable=True)
    others = Column(JSON, nullable=True)
    points = Column(Integer, default=1)
    
    quiz = relationship("Quiz", back_populates="questions")
    options = relationship("Option", back_populates="question", cascade="all, delete-orphan")

class Option(Base):
    __tablename__ = "options"
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), index=True)
    content = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)
    
    question = relationship("Question", back_populates="options")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), index=True)
    mode = Column(String(50)) # sequential, random, mastery
    score = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    is_archived = Column(Boolean, default=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    answers = relationship("UserAnswer", back_populates="attempt", cascade="all, delete-orphan")

class UserAnswer(Base):
    __tablename__ = "user_answers"
    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"), index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), index=True)
    selected_option_id = Column(Integer, ForeignKey("options.id"), nullable=True)
    is_correct = Column(Boolean, default=False)
    active_time = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    attempt = relationship("QuizAttempt", back_populates="answers")

class QuizSession(Base):
    __tablename__ = "quiz_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), index=True)
    mode = Column(String) # classic, chaos, mastery, batch
    current_index = Column(Integer, default=0)
    state_json = Column(String) # For storing question order/answers
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserQuestionNote(Base):
    __tablename__ = "user_question_notes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), index=True)
    content = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    question = relationship("Question")

class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    quizzes = relationship("Quiz", secondary="quiz_tags", back_populates="tags")

class QuizTag(Base):
    __tablename__ = "quiz_tags"
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)

class QuizRoom(Base):
    __tablename__ = "quiz_rooms"
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), index=True)
    room_code = Column(String(20), unique=True, index=True)
    host_id = Column(Integer, ForeignKey("users.id"), index=True)
    status = Column(String(50), default="waiting") # waiting, active, finished
    settings = Column(JSON, nullable=True) # { "show_leaderboard": true, "auto_start": false }
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    
    quiz = relationship("Quiz")
    host = relationship("User")
    participants = relationship("QuizRoomParticipant", back_populates="room", cascade="all, delete-orphan")

class QuizRoomParticipant(Base):
    __tablename__ = "quiz_room_participants"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("quiz_rooms.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    is_ready = Column(Boolean, default=False)
    score = Column(Integer, default=0)
    total_answered = Column(Integer, default=0)
    joined_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    room = relationship("QuizRoom", back_populates="participants")
    user = relationship("User")

class QuizRoomChat(Base):
    __tablename__ = "quiz_room_chats"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("quiz_rooms.id", ondelete="CASCADE"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    room = relationship("QuizRoom")
    user = relationship("User")

class QuizCollaborator(Base):
    __tablename__ = "quiz_collaborators"
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    added_at = Column(DateTime, default=datetime.utcnow)
    
    quiz = relationship("Quiz", back_populates="collaborators")
    user = relationship("User")

class UserQuizGoal(Base):
    __tablename__ = "user_quiz_goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), index=True)
    daily_target = Column(Integer, default=5)
    streak_count = Column(Integer, default=0)
    last_completed_date = Column(String(50), nullable=True) # YYYY-MM-DD
    status = Column(String(50), default="active") # active, paused, completed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    quiz = relationship("Quiz")

class UserDailyProgress(Base):
    __tablename__ = "user_daily_progress"
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("user_quiz_goals.id"), index=True)
    date = Column(String(50), index=True) # YYYY-MM-DD
    count_done = Column(Integer, default=0)
    is_target_met = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    goal = relationship("UserQuizGoal")

class UserQuestionMastery(Base):
    __tablename__ = "user_question_mastery"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), index=True)
    box_level = Column(Integer, default=1)  # Leitner system box 1-5 (Mastery level)
    consecutive_correct = Column(Integer, default=0)
    last_answered = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    question = relationship("Question")


class UserGlobalGoal(Base):
    __tablename__ = "user_global_goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    daily_time_target = Column(Integer, default=20) # in minutes
    daily_card_target = Column(Integer, default=20) # number of cards
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

