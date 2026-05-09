import google.generativeai as genai
from app.core.config import settings

class AIService:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None

    async def explain_question(self, question_text: str, options: list, correct_answer: str) -> str:
        if not self.model:
            return "AI service is not configured (API key missing)."
        
        prompt = f"""
        As an expert educator, explain why the correct answer is "{correct_answer}" for the following question:
        Question: {question_text}
        Options: {", ".join(options)}
        
        Provide a concise, clear explanation and a memory tip. Use professional and encouraging tone.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"AI explanation failed: {str(e)}"

ai_service = AIService()
