import sqlite3
import os

# Base dir is C:\Code\Ecosystem\QuizMind
# Storage dir is C:\Code\Ecosystem\Storage\database
# db_path is C:\Code\Ecosystem\Storage\database\quizmind.db

db_path = os.path.abspath(os.path.join(os.getcwd(), '..', 'Storage', 'database', 'quizmind.db'))
print(f"Checking for DB at: {db_path}")

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE quiz_sessions ADD COLUMN user_id INTEGER DEFAULT 1;")
        conn.commit()
        print("Success: Added user_id to quiz_sessions")
    except Exception as e:
        print(f"Error or Already exists: {e}")
    finally:
        conn.close()
else:
    print(f"Error: {db_path} not found")
