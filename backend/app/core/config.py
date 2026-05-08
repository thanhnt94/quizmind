import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "QuizMind"
    API_V1_STR: str = "/api/v1"
    
    # Database
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    STORAGE_DIR: str = os.path.join(BASE_DIR, "..", "Storage", "database")
    
    @property
    def DATABASE_URL(self) -> str:
        # Create directory if it doesn't exist
        os.makedirs(self.STORAGE_DIR, exist_ok=True)
        db_path = os.path.join(self.STORAGE_DIR, "quizmind.db")
        return f"sqlite+aiosqlite:///{db_path}"
    
    # SSO / CentralAuth
    CENTRAL_AUTH_URL: str = os.getenv("CENTRAL_AUTH_URL", "http://localhost:5000")
    CLIENT_ID: str = os.getenv("CLIENT_ID", "quizmind-v1")
    CLIENT_SECRET: str = os.getenv("CLIENT_SECRET", "quizmind_secret_123")
    
    # AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()
