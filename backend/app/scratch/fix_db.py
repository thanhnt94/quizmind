import sqlite3
import os

# Resolved path based on config.py
db_path = "c:\\Code\\Ecosystem\\QuizMind\\Storage\\database\\quizmind.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"Connected to {db_path}")
    
    try:
        # Add active_time to user_answers
        cursor.execute("ALTER TABLE user_answers ADD COLUMN active_time FLOAT DEFAULT 0.0")
        print("Added active_time to user_answers")
    except Exception as e:
        print(f"active_time might already exist: {e}")
        
    try:
        # Add created_at to user_answers
        cursor.execute("ALTER TABLE user_answers ADD COLUMN created_at DATETIME")
        print("Added created_at to user_answers")
    except Exception as e:
        print(f"created_at might already exist: {e}")
        
    conn.commit()
    conn.close()
    print("Database fix completed.")
else:
    print(f"Database file not found at {db_path}")
    # Try searching relative to where we are
    current_dir = os.getcwd()
    print(f"Current working directory: {current_dir}")
