import sqlite3

db_path = r"c:\Code\Ecosystem\Storage\database\quizmind.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

sample_instruction = "Chọn cách đọc đúng cho từ được gạch chân trong câu."
sample_prompt = """Bạn là một chuyên gia khảo thí và ngôn ngữ học kỳ cựu (đặc biệt là tiếng Nhật JLPT). Nhiệm vụ của bạn là giải thích câu hỏi một cách cực kỳ chi tiết và chuyên sâu.

Cấu trúc giải thích của bạn phải bao gồm:
1. HƯỚNG DẪN GIẢI: Nêu rõ loại bài tập (ví dụ: Tìm cách đọc Kanji, Cách dùng từ, Ngữ pháp) và phương pháp tư duy để tìm ra đáp án.
2. PHÂN TÍCH CHI TIẾT:
   - Đối với đáp án ĐÚNG: Giải thích ý nghĩa, cách dùng trong ngữ cảnh này, cung cấp ví dụ thực tế. Phân tích các từ vựng/kanji thành phần.
   - Đối với các đáp án SAI: Giải thích ý nghĩa của chúng, tại sao chúng lại gây nhầm lẫn (ví dụ: cách đọc gần giống, chữ Kanji tương tự, hoặc dùng sai ngữ cảnh).
3. MẸO GHI NHỚ: Cung cấp một câu thần chú hoặc mẹo liên tưởng để người học không bao giờ sai lại câu này.
4. TỪ VỰNG MỞ RỘNG: Liệt kê 2-3 từ vựng liên quan hoặc cùng chủ đề xuất hiện trong câu.

Hãy sử dụng Markdown để trình bày đẹp mắt, dùng các emoji phù hợp để tạo cảm hứng học tập. Ngôn ngữ: Tiếng Việt."""

cursor.execute("UPDATE quizzes SET instruction = ?, ai_prompt = ? WHERE id = 1;", (sample_instruction, sample_prompt))
conn.commit()
conn.close()
print("Quiz 1 updated with sample instruction and AI prompt.")
