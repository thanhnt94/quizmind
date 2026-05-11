import sqlite3
import os

db_path = r"c:\Code\Ecosystem\Storage\database\quizmind.db"
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE quizzes ADD COLUMN instruction TEXT;")
    conn.commit()
    conn.close()
    print("Column 'instruction' added successfully to 'quizzes' table.")
except Exception as e:
    print(f"Error: {e}")
