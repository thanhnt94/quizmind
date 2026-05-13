from google import genai
from app.core.config import settings

class GeminiService:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
            self.model_id = 'gemini-2.0-flash'
        else:
            self.client = None

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
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"Error generating explanation: {str(e)}"
