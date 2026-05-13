from google import genai
from app.core.config import settings

class GeminiService:
    def __init__(self, api_key: str = None, model_id: str = 'gemini-2.0-flash'):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_id = model_id
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    @classmethod
    async def from_db(cls, db):
        from app.modules.admin.interface import AdminInterface
        config = await AdminInterface.get_ai_config(db)
        return cls(api_key=config.get("api_key"), model_id=config.get("model_id", "gemini-2.0-flash"))

    async def generate_explanation(self, question: str, options: list, correct_answer: str) -> str:
        if not self.client:
            return "AI Explanation not available (API Key missing)."
        
        prompt = f"""
        Provide a detailed and educational explanation for the following multiple-choice question.
        
        Question: {question}
        Options: {', '.join(options)}
        Correct Answer: {correct_answer}
        
        Explain why the correct answer is right and why other options might be confusing.
        Output language should be Vietnamese if the question is in Vietnamese, otherwise English.
        """
        
        try:
            # Use async client (aio)
            response = await self.client.aio.models.generate_content(
                model=self.model_id,
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"Error generating explanation: {str(e)}"
