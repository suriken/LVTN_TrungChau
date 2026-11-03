# HƯỚNG DẪN CHUYỂN ĐỔI HẠ TẦNG SANG CLOUDFLARE WORKER & D1
### Giải Pháp Thay Thế Render & Supabase: Nhanh Gấp 100 Lần, Không Ngủ Đông, Miễn Phí 100%

Tài liệu này hướng dẫn chi tiết cách chuyển đổi các website báo cáo hằng ngày (hiện đang chạy bằng **Python Stack trên Render** và **Supabase Database**) sang mô hình **Cloudflare Pages/Worker + D1 Database** tương tự như dự án PTV Trung Châu 1.

---

## 1. TẠI SAO NÊN CHUYỂN ĐỔI? (SO SÁNH THỰC TẾ)

| Tiêu Chí | Hạ Tầng Cũ (Render + Supabase) | Hạ Tầng Mới (Cloudflare + D1) |
| :--- | :--- | :--- |
| **Hiện tượng ngủ đông (Cold Start)** | **Rất khó chịu (50s – 90s)** nếu 15 phút không có người vào web | **0 giây (Zero Cold-Start)**, luôn thức 24/7 trên hơn 300 trạm CDN toàn cầu |
| **Tốc độ phản hồi (Latency)** | 800ms – 2500ms (Máy chủ Render đặt ở Mỹ/Singapore) | **15ms – 50ms (Tức thì)** do chạy trực tiếp tại biên mạng Cloudflare VN |
| **Tên miền riêng** | Cấu hình DNS qua CNAME phức tạp | **Cực dễ** vì tên miền `monnguyen.dev` đã nằm sẵn trên Cloudflare |
| **Tự động triển khai (CI/CD)** | Chậm (mỗi lần push mất 2-4 phút build Docker/Python) | **Cực nhanh (10 giây)** đẩy code từ GitHub là web tự cập nhật |
| **Chi phí** | 0đ (nhưng bị bóp RAM 512MB, dễ sập nếu query nặng) | **0đ vĩnh viễn** (5 triệu lượt đọc/ngày, 100.000 lượt ghi/ngày) |

---

## 2. CHỌN MÔ HÌNH CHUYỂN ĐỔI PHÙ HỢP

Bạn có 2 lựa chọn chuyển đổi tùy thuộc vào cấu trúc web báo cáo của bạn:

### 🏆 Mô Hình 1: Chuyển Sang "Cloudflare All-in-One" (Khuyên Dùng Nhất)
- **Áp dụng cho:** Các web báo cáo số liệu, dashboard hiển thị biểu đồ, form nhập liệu hàng ngày, sổ tay công việc...
- **Cấu trúc:**
  - **Frontend:** Single-Page HTML/Tailwind CSS/Chart.js tĩnh (như trang Trung Châu).
  - **Backend API:** Cloudflare Worker (`_worker.js`) viết bằng JavaScript/TypeScript siêu nhẹ.
  - **Database:** Cloudflare D1 (SQLite phân tán) thay thế cho Supabase.
- **Ưu điểm:** Loại bỏ hoàn toàn Render, web chạy mượt như bay, không bao giờ lo sập.

### 🔄 Mô Hình 2: Giữ Lại Supabase Nhưng Đưa Toàn Bộ Frontend & API Về Cloudflare
- **Áp dụng cho:** Các dự án có cấu trúc dữ liệu Supabase phức tạp mà bạn chưa muốn chuyển data.
- **Cấu trúc:**
  - Frontend & API Proxy chạy trên Cloudflare Worker.
  - Worker gọi trực tiếp vào Supabase REST API (`https://xxx.supabase.co/rest/v1/...`) qua HTTP Fetch.
- **Ưu điểm:** Bỏ được Render (không còn bị ngủ đông 60s), dữ liệu Supabase vẫn giữ nguyên.

---

## 3. QUY TRÌNH 5 BƯỚC TRIỂN KHAI CHO MỘT WEBSITE BÁO CÁO MỚI

Giả sử bạn muốn tạo web mới có tên miền: **`baocao.monnguyen.dev`** (hoặc chuyển `lichdangle`, `vdvl`):

### Bước 1: Khởi Tạo Dự Án Trên GitHub
Tạo 1 repo mới trên GitHub (ví dụ: `daily-reports`) với cấu trúc tối giản:
```text
daily-reports/
├── index.html        (Giao diện web báo cáo, biểu đồ, bảng lọc)
├── _worker.js        (Backend API xử lý đọc/ghi dữ liệu D1)
├── wrangler.json     (Cấu hình kết nối Cloudflare & D1)
└── schema.sql        (Cấu trúc bảng cơ sở dữ liệu)
```

---

### Bước 2: Tạo Cơ Sở Dữ Liệu Cloudflare D1
1. Vào Cloudflare Dashboard: **Storage & Databases** $\to$ **D1 SQL Database**.
2. Bấm **Create database** $\to$ Đặt tên (ví dụ: `baocao-db`) $\to$ Bấm **Create**.
3. Copy chuỗi **Database ID** (ví dụ: `12345678-abcd-ef01-2345-6789abcdef01`).
4. Chuyển sang tab **Console**, dán câu lệnh tạo bảng báo cáo hàng ngày:
```sql
CREATE TABLE IF NOT EXISTS daily_reports (
  id TEXT PRIMARY KEY,
  report_date TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT,
  title TEXT NOT NULL,
  content TEXT,
  metrics_json TEXT,
  status TEXT DEFAULT 'completed',
  created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_reports_date ON daily_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_author ON daily_reports(author);
```
5. Bấm **Execute**.

---

### Bước 3: Cấu Hình `wrangler.json` Trong Repo
Tạo file `wrangler.json` ở thư mục gốc của repo:
```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "daily-reports",
  "main": "_worker.js",
  "compatibility_date": "2024-11-01",
  "assets": {
    "directory": ".",
    "binding": "ASSETS",
    "run_worker_first": true
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "baocao-db",
      "database_id": "DÁN_DATABASE_ID_CỦA_BẠN_VÀO_ĐÂY"
    }
  ]
}
```

---

### Bước 4: Viết File API `_worker.js` (Mẫu Chuẩn Sẵn Dùng)
File `_worker.js` đảm nhận nhiệm vụ vừa làm API CRUD dữ liệu, vừa phục vụ file HTML:
```javascript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { ...corsHeaders, "Content-Type": "application/json;charset=utf-8" }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Xử lý CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const db = env.DB; // Database D1 đã bind

    // 2. Xử lý API routes
    if (url.pathname.startsWith("/api")) {
      // API: Lấy danh sách báo cáo
      if (request.method === "GET") {
        const { results } = await db.prepare("SELECT * FROM daily_reports ORDER BY report_date DESC, created_at DESC LIMIT 100").all();
        return jsonRes({ success: true, data: results });
      }

      // API: Tạo mới hoặc cập nhật báo cáo
      if (request.method === "POST") {
        const body = await request.json();
        const id = body.id || ("RPT-" + Date.now());
        const now = Date.now();

        await db.prepare(`
          INSERT INTO daily_reports (id, report_date, author, category, title, content, metrics_json, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            report_date = excluded.report_date,
            author = excluded.author,
            category = excluded.category,
            title = excluded.title,
            content = excluded.content,
            metrics_json = excluded.metrics_json,
            status = excluded.status
        `).bind(
          id, body.report_date, body.author, body.category || "",
          body.title, body.content || "", JSON.stringify(body.metrics || {}),
          body.status || "completed", now
        ).run();

        return jsonRes({ success: true, id: id, message: "Lưu báo cáo thành công!" });
      }

      // API: Xóa báo cáo
      if (request.method === "DELETE") {
        const id = url.searchParams.get("id");
        if (id) {
          await db.prepare("DELETE FROM daily_reports WHERE id = ?").bind(id).run();
          return jsonRes({ success: true, message: "Đã xóa báo cáo!" });
        }
      }
    }

    // 3. Phục vụ giao diện tĩnh index.html qua Cloudflare Static Assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Daily Reports API running.", { headers: corsHeaders });
  }
};
```

---

### Bước 5: Triển Khai Lên Cloudflare & Gắn Subdomain
1. Đẩy code lên GitHub:
   ```bash
   git add .
   git commit -m "initial commit"
   git push origin main
   ```
2. Vào Cloudflare Dashboard: **Workers & Pages** $\to$ **Create application** $\to$ Tab **Workers** $\to$ Chọn **Connect to Git** $\to$ Chọn repo `daily-reports`.
3. Bấm **Deploy**.
4. Vào Worker vừa tạo $\to$ mục **Settings** $\to$ **Domains & Routes** $\to$ Bấm **Add Custom domain** $\to$ Điền:
   `baocao.monnguyen.dev`
5. Bấm **Add Custom Domain**.

Xong! Web báo cáo mới của bạn sẽ chạy 24/7 tại `https://baocao.monnguyen.dev`, tốc độ load trang dưới 0.1 giây, không bao giờ phải đợi 1 phút khởi động như Render nữa!

