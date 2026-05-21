# QuizMind Project Rules & Standards

## 🏗 Architecture: Modular Monolith (Hexagonal Style)
Tuân thủ nghiêm ngặt các quy tắc định nghĩa trong `MindStack/docs/MODULE_STRUCTURE.md`.

### Cấu trúc Module (`app/modules/{module_name}/`)
- `models.py`: Định nghĩa Database Models (SQLAlchemy).
- `schemas.py`: Pydantic models cho Data Transfer Objects (DTOs) và validation.
- `interface.py`: Cổng giao tiếp CÔNG KHAI cho các module khác.
- `routes/api.py`: Tầng giao tiếp (FastAPI Endpoints).
- `services/`: Tầng điều phối logic nghiệp vụ có tương tác Database.
- `engine/`: Tầng logic nghiệp vụ lõi (Business Rules - Pure Python, không DB).

### Quy tắc phụ thuộc (Dependency Rules)
- **Engine là Thánh địa:** Không biết DB, không biết Framework. Chỉ nhận và trả về dữ liệu thuần.
- **Service là Quản gia:** Nơi duy nhất được phép truy cập Database.
- **Giao tiếp liên module:** BẮT BUỘC phải thông qua `interface.py`. Không import trực tiếp models/services của module khác.

## 🎨 Frontend Standards (React + Vite + Tailwind)
- **Premium Aesthetics:** Giao diện phải mang lại cảm giác hiện đại, cao cấp (glassmorphism, vibrant colors, micro-animations).
- **Design Tokens:**
  - `rounded-[2.5rem]` cho các thẻ card chính.
  - `rounded-2xl` hoặc `rounded-xl` cho các nút và phần tử bên trong.
  - `indigo-600` là màu chủ đạo cho hành động.
  - `slate-900` cho các thành phần tối/nền sâu.
- **Mobile Optimization:**
  - Thanh điều hướng bám sát đáy (Flush bottom), không để khoảng trống thừa.
  - Hỗ trợ thao tác một tay (các nút quan trọng đặt ở nửa dưới màn hình).
  - Ưu tiên hiển thị nội dung "thả xuống" tự nhiên, không sử dụng `max-h` cố định gây khó chịu khi cuộn.

## 🛠 Development Workflow
- **Build:** Luôn chạy `python build_vite.py` sau khi thay đổi frontend để đóng gói lên Production.
- **Database:** BẮT BUỘC sử dụng **Alembic** cho mọi thay đổi schema.
  - Không chạy lệnh SQL trực tiếp lên DB chính mà phải thông qua migration version.
  - `alembic revision --autogenerate -m "message"`
  - `alembic upgrade head`
- **AI Prompting:**
  - Tận dụng trường `ai_prompt` ở cấp độ Quiz để tối ưu hóa câu trả lời của AI cho từng bộ đề cụ thể.
  - Sử dụng trường `instruction` để hiển thị yêu cầu chung cho cả bộ đề bài.

## 📝 Coding Guidelines
- **Async First:** Sử dụng `AsyncSession` và các hàm `async/await` cho mọi tương tác IO/DB.
- **Validation:** Mọi dữ liệu đầu vào từ API phải được validate qua Pydantic Schema.
- **Documentation:** Giữ nguyên các comment/docstring quan trọng khi refactor code.

## 🚀 Performance & DB Optimization Rules (New)
- **ForeignKey Indexing:** TẤT CẢ các trường khóa ngoại (ForeignKey) trong models SQLAlchemy bắt buộc phải khai báo `index=True` để tăng tốc độ truy vấn (Join/Filter) lên tới 10x - 100x và bảo vệ CPU của SQLite.
- **Consolidated Queries:** Hợp nhất các truy vấn đếm dữ liệu (count) hoặc phân tích thống kê thành một câu lệnh SQL duy nhất sử dụng subqueries (scalar_subquery) thay vì chạy nhiều câu lệnh SQL rời rạc gây nghẽn kết nối.

## ⚡ Gamification & Timezone Rules (New)
- **Timezone-Independent Streaks:** Việc tính toán streak học tập không được dựa trên so sánh timestamp UTC ở server. Thay vào đó:
  - Sử dụng model `UserDailyActivity` để ghi nhận hoạt động học tập dựa trên ngày lịch địa phương (`activity_date` có kiểu dữ liệu `Date`).
  - Phía Client (React) bắt buộc truyền lên tham số `local_date` được định dạng `YYYY-MM-DD` (sử dụng `new Date().toLocaleDateString('en-CA')`).
  - Hàm `update_streak` kiểm tra tính liên tục bằng ngày lịch địa phương gửi lên này.

## 🔒 Alembic & Metadata Standards (New)
- **Prevent Auto-Deletion:** Mọi database model mới (ví dụ: `UserDailyActivity`, `SSOConfig`) bắt buộc phải được khai báo import đầy đủ trong `migrations/env.py` trước khi chạy autogenerate migration. Điều này ngăn Alembic nhận diện sai và tự động phát hiện lệnh xóa (drop table) các bảng quan trọng của hệ thống.
- **Standardized Terminology:** QuizMind tập trung 100% vào **Trắc nghiệm nhiều lựa chọn (Multiple Choice Quizzes)**. Không sử dụng thuật ngữ "Flashcard" hay "Spaced Repetition" trong tài liệu, mã nguồn và API.

