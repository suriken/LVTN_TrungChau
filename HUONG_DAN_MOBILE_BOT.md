# 📱 HƯỚNG DẪN ĐIỀU KHIỂN & DEPLOY DỰ ÁN TỪ IPHONE (iOS) QUA TELEGRAM

Hệ thống cho phép Quý Huynh/Tỷ **gửi prompt trực tiếp từ ứng dụng Telegram trên iPhone**. Máy tính ở nhà sẽ tự động:
1. Tiếp nhận prompt.
2. Dùng AI Gemini đọc mã nguồn, sửa code, kiểm tra cú pháp an toàn.
3. Tự động `git commit` & `git push` lên GitHub `main`.
4. Kích hoạt GitHub Actions tự động Clasp Deploy lên Google Apps Script.
5. Gửi thông báo kết quả chi tiết về lại Telegram trên iPhone!

---

## 🛠️ CÁC BƯỚC THIẾT LẬP (CHỈ LÀM 1 LẦN DUY NHẤT - MẤT 3 PHÚT)

### Bước 1: Tạo Bot Telegram (1 phút)
1. Trên iPhone, mở ứng dụng **Telegram**, tìm kiếm tài khoản: **`@BotFather`** (có tích xanh).
2. Bấm **Start** hoặc gõ `/newbot`.
3. Đặt tên hiển thị cho Bot (ví dụ: `Trung Chau Dev Bot`).
4. Đặt username cho Bot kết thúc bằng chữ `bot` (ví dụ: `trungchau_ptv_bot`).
5. BotFather sẽ gửi cho bạn một chuỗi **Token**, dạng như sau:
   `7123456789:AAFlq...` (Hãy sao chép chuỗi này).

---

### Bước 2: Lấy Gemini API Key Miễn Phí (1 phút)
1. Truy cập vào trang: [Google AI Studio (aistudio.google.com/app/api-keys)](https://aistudio.google.com/app/api-keys).
2. Đăng nhập bằng tài khoản Google.
3. Bấm nút **"Create API key"** -> Sao chép chuỗi API key được tạo ra.

---

### Bước 3: Điền Vào File Cấu Hình Trên Máy Tính (1 phút)
1. Tại thư mục dự án `d:\Workspace\Github\LVTN_TrungChau`, tạo file tên là **`telegram_config.json`** (hoặc copy từ file `telegram_config.example.json`).
2. Mở file và dán thông tin của Quý Huynh/Tỷ vào:
   ```json
   {
     "telegram_bot_token": "DÁN_TOKEN_TỪ_BOTFATHER_VÀO_ĐÂY",
     "telegram_chat_id": "",
     "gemini_api_key": "DÁN_GEMINI_API_KEY_VÀO_ĐÂY"
   }
   ```
   *(Mục `telegram_chat_id` có thể để trống, khi gửi tin nhắn `/start` đầu tiên từ iPhone thì Bot sẽ tự động nhận diện và khóa bảo mật chỉ nhận lệnh từ tài khoản của bạn).*

---

### Bước 4: Khởi Động Bot Trên Máy Tính
* Chỉ cần nhấp đúp chuột vào file: **`start_telegram_bot.bat`**.
* Màn hình sẽ hiện thông báo:
  `✅ Đã kết nối thành công với Bot: @trungchau_ptv_bot`
  `⏳ Đang lắng nghe tin nhắn từ iPhone...`

---

## 📲 CÁCH SỬ DỤNG TRÊN IPHONE

Mở Telegram trên iPhone, vào khung chat với Bot của Quý Huynh/Tỷ:

1. **Gõ prompt bất kỳ:**
   * *"Đổi màu nền thẻ Trụ Cột I thành màu xanh dương nhạt"*
   * *"Thêm trường ghi chú ngày sinh ở thông tin người khảo sát"*
   * *"Sửa lại tiêu đề Phần 3"*
   * *"Kiểm tra lại công thức tính điểm trung bình"*
2. **Các lệnh tiện ích:**
   * `/status` : Xem nhánh git và các file đang chỉnh sửa.
   * `/deploy` : Đẩy git push lên GitHub để kích hoạt deploy ngay.
   * `/log` : Xem lịch sử 5 commit gần nhất.
   * `/help` : Xem hướng dẫn sử dụng.

---

## 🔒 TÍNH BẢO MẬT TUYỆT ĐỐI
* File `telegram_config.json` chứa Token & API Key đã được thêm vào `.gitignore`, tuyệt đối **không bao giờ bị đẩy lên GitHub**.
* Bot chỉ phản hồi duy nhất tài khoản Telegram của Quý Huynh/Tỷ. Bất kỳ ai khác nhắn tin vào bot sẽ bị từ chối truy cập ngay lập tức (`⛔ Bạn không có quyền điều khiển hệ thống này!`).
