import sqlite3

db_path = r"c:\Code\Ecosystem\Storage\database\quizmind.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Authentic JLPT instruction
authentic_instruction = "問題Ⅰ　______の言葉の読み方として最もよいものを、1・2・3・4から一つ選びなさい。"

# 2. Concise AI prompt
concise_ai_prompt = """Giải thích câu hỏi JLPT này:
- Câu hỏi: {{question}}
- Các lựa chọn: {{options}}
- Đáp án đúng: {{correct_answer}}

Phân tích ngắn gọn: Tại sao đúng? Tại sao các câu khác sai? Mẹo nhớ nhanh. (Tiếng Việt, Markdown)"""

cursor.execute("UPDATE quizzes SET instruction = ?, ai_prompt = ? WHERE id = 1;", (authentic_instruction, concise_ai_prompt))
conn.commit()
conn.close()
print("Quiz 1 updated with authentic JLPT instruction and concise AI prompt.")
