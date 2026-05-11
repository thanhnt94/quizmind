import sqlite3

db_path = r"c:\Code\Ecosystem\Storage\database\quizmind.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

sample_prompt = """Bạn là một chuyên gia khảo thí và ngôn ngữ học kỳ cựu (đặc biệt là tiếng Nhật JLPT). Nhiệm vụ của bạn là giải thích câu hỏi sau đây một cách cực kỳ chi tiết và chuyên sâu:

CÂU HỎI: {{question}}
CÁC ĐÁP ÁN:
{{options}}
ĐÁP ÁN ĐÚNG: {{correct_answer}}

Cấu trúc giải thích của bạn phải bao gồm:
1. HƯỚNG DẪN GIẢI: Nêu rõ loại bài tập và phương pháp tư duy để tìm ra đáp án.
2. PHÂN TÍCH CHI TIẾT:
   - Đối với đáp án ĐÚNG: Giải thích ý nghĩa, cách dùng, ví dụ. Phân tích kanji/từ vựng.
   - Đối với các đáp án SAI: Tại sao sai, các lỗi thường gặp.
3. MẸO GHI NHỚ: Mẹo liên tưởng để không bao giờ sai lại.
4. TỪ VỰNG MỞ RỘNG: 2-3 từ liên quan.

Hãy sử dụng Markdown đẹp mắt, emoji phù hợp. Ngôn ngữ: Tiếng Việt."""

cursor.execute("UPDATE quizzes SET ai_prompt = ? WHERE id = 1;", (sample_prompt,))
conn.commit()
conn.close()
print("Quiz 1 AI Prompt updated with placeholders.")
