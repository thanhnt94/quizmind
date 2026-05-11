from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class OptionSchema(BaseModel):
    id: Optional[int] = None
    content: str
    is_correct: bool

    class Config:
        from_attributes = True

class QuestionSchema(BaseModel):
    id: Optional[int] = None
    content: str
    image: Optional[str] = None
    audio: Optional[str] = None
    question_type: str = "normal"
    explanation: Optional[str] = None
    ai_explanation: Optional[str] = None
    others: Optional[Dict[str, Any]] = None
    points: int = 1
    options: List[OptionSchema]

    class Config:
        from_attributes = True

class QuizSchema(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    category_id: int
    creator_id: Optional[int] = None
    ai_prompt: Optional[str] = None
    instruction: Optional[str] = None
    time_limit: int = 0
    is_active: bool = True
    questions: Optional[List[QuestionSchema]] = []

    class Config:
        from_attributes = True

class CategorySchema(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
