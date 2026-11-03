---
name: lvtn-trungchau-app
description: Kiến trúc, cấu trúc dòng, danh mục hàm và quy tắc kỹ thuật của Hệ thống Khảo sát & Dashboard Luận văn PTV Cấp III Trung Châu 1.
---

# Hướng Dẫn Kiến Trúc Hệ Thống Khảo Sát & Dashboard PTV Trung Châu 1

Tài liệu kỹ thuật này giúp AI Agent định vị chính xác vị trí mã nguồn trong `index.html` và `Code.gs` mà không cần đọc lại toàn bộ tệp, tiết kiệm token tối đa và đảm bảo độ ổn định của hệ thống.

---

## 1. Cấu Trúc Tổng Thể Tệp `index.html` (~7000 dòng)

Tệp `index.html` là Single-Page Application (SPA) All-in-One, không phụ thuộc build tool, chạy trực tiếp trên GitHub Pages hoặc nhúng iframe vào Google Sites.

### Bản Đồ Dòng (Line Map):
| Khu vực | Dòng ước tính | Nội dung chi tiết |
| :--- | :--- | :--- |
| **Header & CDN** | 1 - 20 | CDN FontAwesome, Google Fonts Be Vietnam Pro, Chart.js |
| **CSS & Typography** | 20 - 95 | Font stack, ổn định chữ, chống nhảy chữ Telex, responsive |
| **Sidebar Menu** | 180 - 245 | 5 Tabs chính: `0. Lời Ngỏ`, `1. Khung CT`, `2. Khảo Sát`, `3. Kết Quả`, `4. Quản Trị` |
| **Tab 0: Lời Ngỏ** | 260 - 425 | Giới thiệu đề tài luận văn, ý nghĩa khảo sát, tác giả |
| **Tab 1: Khung CT** | 430 - 1365 | Bảng số hóa 4 khối kiến thức + Bản scan gốc + Tìm kiếm nội dung |
| **Tab 2: Bảng Khảo Sát** | 1370 - 1630 | 4 phần bắt buộc: P1 Thông tin cá nhân, P2 Likert 18 mục, P3 Tu học & phụng sự (19-22), P4 Ý kiến định tính (23-26) |
| **Tab 3: Kết Quả Cá Nhân** | 1640 - 1735 | Thẻ điểm 4 trụ cột, nhận định cá nhân, nút sửa phiếu / làm mới |
| **Tab 4: Dashboard Quản Trị** | 1740 - 2215 | 4 Thẻ tổng hợp, 6 Tab Con Quản trị, Bộ lọc 6 tiêu chí, Bảng danh sách LIFO, 4 khối ý kiến P4, Bản đồ nhiệt 18 mục, Cảnh báo mục $\le 3$, Biểu đồ Chart.js |
| **Floating Nav & Buttons** | 2220 - 2320 | `adminFloatingQuickNav` (5 mục quản trị), `floatingSubmitSurveyBtn`, `floatingProgramBtn`, `scrollToTopBtn` |
| **Modals** | 2320 - 2680 | `loginModal`, `responseDetailModal`, `questionRespondentsModal`, `confirmClearModal`, `cellFloatingModal`, `imageLightboxModal` |
| **JavaScript Core Engine** | 2700 - 6870 | Toàn bộ logic SPA, API, Render, Filter, Sort, Draft |

---

## 2. Danh Mục Các Hàm JavaScript Trọng Yếu

### Quản Lý Tab & Điều Hướng:
- `switchTab(tabId)`: Chuyển giữa 5 tab chính (`welcome`, `docs`, `form`, `personal`, `dashboard`). Bắt buộc kiểm tra `isAdminLoggedIn` trước khi mở `dashboard`.
- `switchAdminSubTab(subTabId)`: Chuyển đổi giữa 6 tab con quản trị (`all`, `danhsach`, `ykien`, `bando`, `caithien`, `bieudo`).
- `updateFloatingButtons()`: Cập nhật hiển thị nút nổi theo từng tab đang mở.
- `scrollToAdminSection(secId)`: Tự động chuyển đúng tab con và cuộn mượt đến mục được chỉ định.

### Bảng Khảo Sát & Nhập Liệu:
- `handleScoreSelection(qId, val)`: Xử lý chọn điểm 1-5; tự động mở ô lý do khi điểm $\le 3$.
- `saveSurveyDraftDebounced(delay=400)`: Lưu nháp vào `localStorage` có trì hoãn (Debounce) để chống giật chữ Telex.
- `updateSurveyProgressDebounced(delay=300)`: Cập nhật thanh tiến độ 26 mục bắt buộc có debounce.
- `handleFormSubmit(e)`: Kiểm tra tính hợp lệ và gửi phiếu lên máy chủ.

### Quản Trị & Phân Tích Dữ Liệu:
- `filterAdminDashboard()`: Lọc tức thì dữ liệu dựa trên 6 dropdown tiêu chí & ô tìm kiếm.
- `renderGlobalDashboard()`: Cập nhật 4 thẻ thống kê và gọi render tất cả bảng/biểu đồ.
- `renderAdminResponsesTable()`: Render bảng phiếu nộp theo ngăn xếp LIFO (người mới nhất xếp trên cùng, STT tính từ dưới lên).
- `renderFeedbackCards()`: Render 4 khối ý kiến tự luận Phần 4.
- `renderHeatmapMatrix()`: Render bảng ma trận nhiệt 18 nội dung đào tạo tô màu 1 $\to$ 5.
- `renderProblematicAlert()`: Render danh sách các mục chưa phù hợp ($\le 3$ điểm).
- `openQuestionRespondentsModal(qId, filterType)`: Mở popup danh sách và thông tin chi tiết người đánh giá từng mục.

---

## 3. Quy Tắc Kỹ Thuật Bất Di Bất Dịch (Crucial Constraints)

1. **Chống lỗi nhảy chữ Tiếng Việt:**
   - Tuyệt đối không gắn `saveSurveyDraft()` hoặc cập nhật DOM đồng bộ trên sự kiện `oninput` của ô nhập liệu. Luôn dùng `saveSurveyDraftDebounced()` và lưu chốt khi `onblur` / `onchange` / `switchTab`.
   - Giữ `spellcheck="false" autocomplete="off"` trên các trường văn bản.
   - Không áp dụng `text-wrap: balance` hoặc `text-wrap: pretty` lên các khối văn bản động/nhập liệu.

2. **Bảo toàn dữ liệu & Cấu trúc Google Sheets:**
   - Cột lưu trữ trên Google Sheets (`Code.gs`) gồm đúng 54 cột.
   - Giữ nguyên các chuỗi `value` của câu hỏi trắc nghiệm và dropdown Phần 3 để không làm sai lệch số liệu thống kê.

3. **Kiểm tra cú pháp trước khi commit:**
   - Luôn chạy: `node -e "const fs = require('fs'); const content = fs.readFileSync('index.html', 'utf8'); ... new Function(allJs);"` để đảm bảo không có lỗi cú pháp JavaScript trước khi đẩy lên Git.

