import subprocess
import os
import sys
import time

def run_backend():
    print("Starting QuizMind (SSR via FastAPI)...")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(script_dir, "backend")
    
    # 1. Run migrations
    print("[MIGRATE] Running database migrations...")
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=backend_dir)
    
    # 2. Run uvicorn
    cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--port", "5080", "--host", "0.0.0.0"]
    return subprocess.Popen(cmd, cwd=backend_dir)

if __name__ == "__main__":
    print("[INIT] Initializing QuizMind SSR Ecosystem...")
    process = run_backend()
    print("\n[OK] QuizMind is running!")
    print("URL: http://localhost:5080")
    print("\nPress Ctrl+C to stop.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping QuizMind...")
