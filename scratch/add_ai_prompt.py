import sqlite3
import os

db_path = r"c:\Code\Ecosystem\Storage\database\quizmind.db"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Adding ai_prompt column to quizzes table...")
    cursor.execute("ALTER TABLE quizzes ADD COLUMN ai_prompt TEXT")
    conn.commit()
    print("Migration successful!")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Column already exists.")
    else:
        print(f"Error: {e}")
except Exception as e:
    print(f"Critical error: {e}")
finally:
    conn.close()
