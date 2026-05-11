import sqlite3

db_path = r"c:\Code\Ecosystem\Storage\database\quizmind.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Authentic JLPT instruction (already set, but keeping for context)
authentic_instruction = "問題Ⅰ　______の言葉の読み方として最もよいものを、1・2・3・4から一つ選びなさい。"

# 2. Advanced AI prompt with table and detailed analysis
advanced_ai_prompt = """Dựa trên yêu cầu: {{global_instruction}}

Hãy giải thích chi tiết câu hỏi JLPT sau:
- Câu hỏi: {{question}}
- Các lựa chọn: 
{{options}}
- Đáp án đúng: {{correct_answer}}

Yêu cầu trình bày:
1. BẢNG PHÂN TÍCH ĐÁP ÁN: Kẻ bảng so sánh 4 lựa chọn (A, B, C, D). Mỗi dòng bao gồm: 
   - Lựa chọn
   - Từ vựng/Kanji tương ứng
   - Hán Việt
   - Nghĩa tiếng Việt
   - Loại từ (Danh từ, Động từ, v.v.)
   - Cách đọc đúng

2. GIẢI THÍCH CHUYÊN SÂU: 
   - Tại sao đáp án {{correct_answer}} là lựa chọn duy nhất đúng? 
   - Phân tích các bẫy trong 3 đáp án còn lại (ví dụ: bẫy âm đục, bẫy chữ Kanji tương đồng).

3. MẸO GHI NHỚ: Cung cấp mẹo liên tưởng hoặc câu thần chú để nhớ từ vựng/ngữ pháp này mãi mãi.

Ngôn ngữ: Tiếng Việt. Sử dụng Markdown đẹp mắt, chuyên nghiệp."""

cursor.execute("UPDATE quizzes SET ai_prompt = ? WHERE id = 1;", (advanced_ai_prompt,))
conn.commit()
conn.close()
print("Quiz 1 updated with advanced AI prompt template (Table + Deep Analysis).")
