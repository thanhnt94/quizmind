import sqlite3
import os

db_path = r"C:\Code\Ecosystem\Storage\database\quizmind.db"

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Add cover_image column to quizzes table
        cursor.execute("ALTER TABLE quizzes ADD COLUMN cover_image TEXT")
        print("Column cover_image added successfully.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column cover_image already exists.")
        else:
            print(f"Error: {e}")

    # Update some quizzes with sample images
    sample_images = [
        "https://images.unsplash.com/photo-1576444399540-d212f16bdf99?q=80&w=800&auto=format&fit=crop", # JLPT
        "https://images.unsplash.com/photo-1523050335392-9bc56753f3e8?q=80&w=800&auto=format&fit=crop", # Education
        "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=800&auto=format&fit=crop", # Study
        "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=800&auto=format&fit=crop"  # School
    ]
    
    cursor.execute("SELECT id FROM quizzes")
    quiz_ids = [row[0] for row in cursor.fetchall()]
    
    for i, qid in enumerate(quiz_ids):
        img = sample_images[i % len(sample_images)]
        cursor.execute("UPDATE quizzes SET cover_image = ? WHERE id = ?", (img, qid))
        print(f"Updated quiz {qid} with image.")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
