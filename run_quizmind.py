import subprocess
import os
import sys
import time

def build_frontend():
    if os.environ.get("SKIP_BUILD"):
        print("[VITE] Skipping frontend compilation because SKIP_BUILD is set.")
        return
        
    if os.name == 'nt':
        print("[VITE] Starting automated frontend build...")
        try:
            import build_vite
            build_vite.build_frontend()
        except ImportError:
            print("[VITE] build_vite module not found, skipping compilation.")
        except Exception as e:
            print(f"[VITE] Automated build failed: {e}")

def run_backend():
    print("Starting QuizMind (Standalone via FastAPI)...")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Run migrations (if any)
    print("[MIGRATE] Running database migrations...")
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=script_dir)
    
    # 2. Run uvicorn
    cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--port", "5080", "--host", "0.0.0.0"]
    return subprocess.Popen(cmd, cwd=script_dir)

if __name__ == "__main__":
    print("[INIT] Initializing QuizMind Ecosystem...")
    build_frontend()
    process = run_backend()
    print("\n[OK] QuizMind is running!")
    print("URL: http://localhost:5080")
    print("\nPress Ctrl+C to stop.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping QuizMind...")

