import traceback
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

try:
    print("Sending GET request to /api/v1/quiz/goals/global...")
    # Inject user_id cookie
    client.cookies.set("user_id", "1")
    response = client.get("/api/v1/quiz/goals/global")
    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    print(response.json())
except Exception as e:
    print("EXCEPTION:")
    traceback.print_exc()
