---
name: auto-git-deploy
description: Tự động kiểm tra cú pháp, commit và push mã nguồn lên GitHub (origin main) ngay sau khi hoàn thành tạo hoặc chỉnh sửa mã nguồn. Kích hoạt tự động sau mỗi phiên sinh code (code generation, bugfix, refactor).
---

# Skill: Tự Động Deploy Mã Nguồn Lên GitHub (Auto Git Deploy)

Skill này hướng dẫn AI Agent thực hiện chu trình kiểm tra chất lượng (QA), đóng gói và đẩy mã nguồn lên kho lưu trữ GitHub từ xa (`origin main`) một cách tự động, nhất quán và an toàn ngay sau khi hoàn thành bất kỳ tác vụ sinh mã hoặc sửa đổi tệp nào.

---

## 1. Mục Đích & Nguyên Tắc Cốt Lõi

1. **Tự động hóa 100%:** Sau khi chỉnh sửa hoặc tạo tệp mã nguồn trong dự án, Agent phải **tự động** thực hiện quy trình commit & push mà không cần người dùng phải nhắc.
2. **Không commit code lỗi:** Luôn chạy bước kiểm tra cú pháp (Syntax Validation) trước khi commit. Nếu phát hiện lỗi cú pháp, phải sửa triệt để trước khi push.
3. **Bảo mật dữ liệu:** Không bao giờ stage các file cấu hình bí mật, khóa API hoặc file token (`telegram_config.json`, `.env`, credentials).
4. **Đồng bộ với Cloudflare:** Vì dự án được kết nối CI/CD với Cloudflare Workers/Pages, việc push lên `main` sẽ kích hoạt bản build và triển khai tự động tới người dùng cuối.

---

## 2. Quy Trình 5 Bước Tự Động Thực Hiện (Execution Flow)

Mỗi khi hoàn thành việc chỉnh sửa hoặc tạo mới file mã nguồn (`index.html`, `_worker.js`, `Code.gs`, `schema.sql`, v.v.), Agent phải tuần tự thực hiện các bước sau:

### Bước 1: Kiểm Tra Trạng Thái Tệp Thay Đổi
Chạy lệnh kiểm tra danh sách file đã thay đổi:
```powershell
git status --short
```
Xác định chính xác các tệp cần commit liên quan trực tiếp đến yêu cầu của người dùng.

---

### Bước 2: Kiểm Tra Cú Pháp Trước Khi Commit (Pre-Commit Syntax Check)

Tuân thủ kiểm tra cú pháp tương ứng với loại tệp:

- **Với `index.html` (chứa inline JavaScript):**
  ```powershell
  node -e "
  const fs = require('fs');
  const html = fs.readFileSync('index.html', 'utf8');
  const idx = html.lastIndexOf('<script>');
  if (idx !== -1) {
      const endIdx = html.indexOf('</script>', idx);
      const code = html.substring(idx + 8, endIdx);
      new Function(code);
      console.log('index.html Syntax OK! Length:', code.length);
  }
  "
  ```
- **Với `_worker.js` / file Node.js:**
  ```powershell
  node --check _worker.js
  ```
- **Với file Python (`telegram_agent_bot.py`, `stress_test_*.py`):**
  ```powershell
  python -m py_compile <file_name>.py
  ```

> ⚠️ **Quy tắc chặn lỗi:** Nếu bước này báo lỗi cú pháp (SyntaxError), dừng lại và sửa code ngay lập tức. Tuyệt đối không commit khi chưa vượt qua bước này!

---

### Bước 3: Đưa Tệp Vào Khu Vực Chờ (Git Stage)
Chỉ stage các tệp mã nguồn và tài liệu liên quan đến phiên làm việc:
```powershell
git add index.html _worker.js cloudflare-worker-proxy.js schema.sql wrangler.toml .assetsignore .gemini/
```
*(Tránh dùng `git add -A` bừa bãi khi có các tệp tạm hoặc tệp token nhạy cảm chưa được cấu hình ignore).*

---

### Bước 4: Tạo Commit Message Chuẩn Conventional Commits
Tạo thông điệp commit rõ ràng, mang tính mô tả cao theo định dạng chuẩn quốc tế:
```
<type>(<scope>): <mô tả ngắn gọn bằng tiếng Việt hoặc tiếng Anh>
```
Trong đó `<type>` bao gồm:
- `feat`: Tính năng mới (ví dụ: `feat(dashboard): thêm bộ lọc nâng cao theo đơn vị`)
- `fix`: Sửa lỗi (ví dụ: `fix(dashboard): hiển thị khối cần cải thiện khi chọn tab con`)
- `perf`: Tối ưu hiệu năng / tốc độ tải (ví dụ: `perf(d1): tối ưu truy vấn SQL đọc D1 <15ms`)
- `style`: Sửa lỗi giao diện, căn chỉnh font chữ, CSS (ví dụ: `style(sidebar): căn thẳng hàng icon tab 4`)
- `docs`: Cập nhật tài liệu kỹ thuật, skill, markdown (ví dụ: `docs(skill): cập nhật hướng dẫn auto-deploy`)
- `refactor`: Tái cấu trúc mã nguồn mà không đổi hành vi (ví dụ: `refactor(api): tách hàm xử lý payload`)

Thực hiện commit:
```powershell
git commit -m "<type>(<scope>): <nội dung mô tả>"
```

---

### Bước 5: Đẩy Lên GitHub & Xác Nhận Triển Khai
Thực hiện push lên nhánh chính:
```powershell
git push origin main
```
- Nếu lệnh chạy dưới dạng background task do mạng trễ (>10s), sử dụng `manage_task status` để xác nhận tiến trình kết thúc với mã thoát 0 (`exit code 0`).
- Ghi nhận mã băm commit (Commit SHA) vừa đẩy (ví dụ: `3e69877`).

---

## 3. Báo Cáo Cho Người Dùng Sau Khi Triển Khai

Trong phản hồi cuối cùng tới người dùng, Agent luôn cung cấp bản tóm tắt triển khai gồm:
1. **Mã Commit & Nội dung:** Ví dụ `[main 3e69877] fix(dashboard): decouple sec-admin-caithien...`
2. **Kho lưu trữ:** `https://github.com/suriken/LVTN_TrungChau.git` (nhánh `main`)
3. **Trạng thái Cloudflare:** Xác nhận bản build Cloudflare Workers / Pages tự động được kích hoạt.
4. **Hướng dẫn người dùng:** Gợi ý người dùng bấm **`Ctrl + F5`** trên trình duyệt để kiểm tra kết quả mới nhất.
