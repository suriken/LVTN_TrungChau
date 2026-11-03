# QUY TẮC DỰ ÁN (PROJECT RULES) - PTV TRUNG CHÂU 1

## 1. Tự Động Deploy Lên GitHub Sau Khi Hoàn Thành Code
Mỗi khi Agent hoàn thành việc tạo mới hoặc chỉnh sửa mã nguồn (code generation, bugfix, refactoring, hoặc tối ưu giao diện):
- **Bắt buộc tự động kích hoạt Skill `auto-git-deploy`** (`.gemini/skills/auto-git-deploy/SKILL.md`).
- **Quy trình chuẩn:**
  1. Kiểm tra cú pháp (Syntax Validation) với Node.js / Python để đảm bảo 0% lỗi trước khi commit.
  2. Tạo Commit Message chuẩn Conventional Commits (`feat(...)`, `fix(...)`, `perf(...)`, `style(...)`, `docs(...)`).
  3. Tự động `git push origin main` lên kho lưu trữ GitHub.
  4. Thông báo mã commit hash và xác nhận trạng thái triển khai tới người dùng.

## 2. Bảo Toàn Tính Toàn Vẹn Mã Nguồn
- Tệp `index.html` là SPA All-in-One (~7000 dòng). Tra cứu vị trí hàm và cấu trúc tại `.gemini/skills/lvtn-trungchau-app/SKILL.md` để chỉnh sửa chính xác, tránh đọc lại toàn bộ tệp gây lãng phí token.
- Luôn giữ cơ chế chống giật/nhảy con trỏ Tiếng Việt (Debounce, font stack Be Vietnam Pro, inline style).
- Đảm bảo tính tương thích đồng thời giữa Cloudflare D1 Database và Google Sheets fallback.
