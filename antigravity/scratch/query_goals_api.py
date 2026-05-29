import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

try:
    req = urllib.request.Request(
        "http://localhost:5080/api/v1/quiz/goals/global",
        headers={"Cookie": "user_id=1"}
    )
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print("API STATUS:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
except Exception as e:
    print(f"Error calling API: {e}")
