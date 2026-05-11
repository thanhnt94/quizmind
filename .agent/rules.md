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
