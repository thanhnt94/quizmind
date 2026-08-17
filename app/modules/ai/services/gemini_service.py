from google import genai
from app.core.config import settings
import httpx
import logging

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self, api_key: str = None, model_id: str = 'gemini-2.0-flash', sso_server_url: str = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_id = model_id
        self.sso_server_url = sso_server_url
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    @classmethod
    async def from_db(cls, db):
        from app.modules.admin.interface import AdminInterface
        from app.modules.sso_module.service import SSOService
        config = await AdminInterface.get_ai_config(db)
        sso_config = await SSOService.get_config(db)
        sso_url = sso_config.server_url if sso_config and sso_config.is_enabled else None
        return cls(
            api_key=config.get("api_key"), 
            model_id=config.get("model_id", "gemini-2.0-flash"),
            sso_server_url=sso_url
        )

    async def generate_explanation(self, question: str, options: list, correct_answer: str) -> str:
        prompt = f"""
        Provide a detailed and educational explanation for the following multiple-choice question.
        
        Question: {question}
        Options: {', '.join(options)}
        Correct Answer: {correct_answer}
        
        Explain why the correct answer is right and why other options might be confusing.
        Output language should be Vietnamese if the question is in Vietnamese, otherwise English.
        """

        if self.client:
            try:
                # Use async client (aio)
                response = await self.client.aio.models.generate_content(
                    model=self.model_id,
                    contents=prompt
                )
                return response.text
            except Exception as e:
                logger.error(f"Local Gemini API error: {e}")

        # Fallback to CentralAuth AI Queue / Direct Gateway if SSO is active
        if self.sso_server_url:
            try:
                queue_token = getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123")
                async with httpx.AsyncClient() as http_client:
                    response = await http_client.post(
                        f"{self.sso_server_url.rstrip('/')}/api/queue/submit",
                        json={
                            "satellite_source": "quizmind",
                            "prompt": prompt,
                            "model": self.model_id
                        },
                        headers={"X-Queue-Token": queue_token},
                        timeout=15.0
                    )
                    if response.status_code == 200:
                        data = response.json()
                        return data.get("result") or "Đã gửi yêu cầu tạo lời giải thích tới AI Queue."
            except Exception as sso_err:
                logger.error(f"CentralAuth AI fallback error: {sso_err}")

        return "AI Explanation not available (API Key missing and CentralAuth unreachable)."

