import sqlite3
import os

db_path = "c:\\Code\\Ecosystem\\QuizMind\\Storage\\database\\quizmind.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"Connected to {db_path}")
    
    # Create quiz_sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quiz_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER,
        mode TEXT,
        current_index INTEGER DEFAULT 0,
        state_json TEXT,
        updated_at DATETIME,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    )
    """)
    print("Created quiz_sessions table if not exists")
    
    conn.commit()
    conn.close()
    print("Database fix completed.")
else:
    print(f"Database file not found at {db_path}")
