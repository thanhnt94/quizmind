import requests
import httpx
from app.core.config import settings

class CentralAuthClient:
    def __init__(self):
        self.api_url = settings.CENTRAL_AUTH_URL.rstrip('/')
        self.client_id = settings.CLIENT_ID
        self.client_secret = settings.CLIENT_SECRET

    def get_login_url(self, callback_url: str):
        return f"{self.api_url}/api/auth/login?client_id={self.client_id}&return_to={callback_url}"

    async def get_token(self, code: str, redirect_uri: str):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/api/auth/token",
                    json={
                        "grant_type": "authorization_code",
                        "code": code,
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "redirect_uri": redirect_uri,
                    },
                    timeout=5
                )
                if response.status_code == 200:
                    return response.json()
        except Exception as e:
            print(f"SSO Token Error: {e}")
        return None

    async def verify_token(self, token: str):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/api/auth/verify-token",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=5
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get('user')
        except Exception as e:
            print(f"SSO Verification Error: {e}")
        return None
