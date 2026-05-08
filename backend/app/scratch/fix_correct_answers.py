import sqlite3
import re
import os

db_path = "c:\\Code\\Ecosystem\\QuizMind\\Storage\\database\\quizmind.db"

def fix_answers():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print(f"Connected to {db_path}")

    # 1. Get all questions with their explanations
    cursor.execute("SELECT id, explanation FROM questions")
    questions = cursor.fetchall()

    fixed_count = 0
    for q_id, explanation in questions:
        if not explanation:
            continue

        # Look for patterns like "d. とびら" or "a. " at the start of lines in explanation
        # Many MindStack exports have "--- LỰA CHỌN VÀ GIẢI THÍCH ---\nd. とびら"
        match = re.search(r'(?i)(?:^|\n)([a-d])\.', explanation)
        
        if match:
            correct_letter = match.group(1).lower()
            # Map a->0, b->1, c->2, d->3
            letter_idx = ord(correct_letter) - ord('a')
            
            # Get options for this question
            cursor.execute("SELECT id FROM options WHERE question_id = ? ORDER BY id ASC", (q_id,))
            options = cursor.fetchall()
            
            if len(options) > letter_idx:
                correct_opt_id = options[letter_idx][0]
                
                # Reset all to False
                cursor.execute("UPDATE options SET is_correct = 0 WHERE question_id = ?", (q_id,))
                # Set the identified one to True
                cursor.execute("UPDATE options SET is_correct = 1 WHERE id = ?", (correct_opt_id,))
                
                fixed_count += 1

    conn.commit()
    conn.close()
    print(f"Successfully reviewed and updated {fixed_count} questions based on explanation clues.")

if __name__ == "__main__":
    fix_answers()
