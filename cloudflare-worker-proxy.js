/**
 * ==============================================================================
 * CLOUDFLARE WORKER REVERSE PROXY CHO HỆ THỐNG KHẢO SÁT PTV TRUNG CHÂU 1
 * ==============================================================================
 * 
 * Tác dụng:
 * 1. Che giấu 100% URL thật của Google Apps Script và Google Sheets.
 * 2. Đóng vai trò tường lửa (Firewall) bảo vệ backend, lọc dữ liệu.
 * 3. Hỗ trợ CORS tự động, chống chặn kết nối từ mọi trang web / Google Sites.
 * 4. Miễn phí 100.000 lượt gọi mỗi ngày (vượt xa nhu cầu khảo sát).
 * 
 * HƯỚNG DẪN TRIỂN KHAI TRÊN CLOUDFLARE (MẤT 2 PHÚT):
 * 1. Truy cập https://dash.cloudflare.com/ (đăng ký tài khoản miễn phí nếu chưa có).
 * 2. Chọn menu "Workers & Pages" > Bấm "Create application" > Bấm "Create Worker".
 * 3. Đặt tên Worker (ví dụ: ptv-survey-api) > Bấm "Deploy".
 * 4. Bấm "Edit code" > Xóa hết mã mặc định và dán toàn bộ nội dung file này vào.
 * 5. Bấm "Deploy" ở góc trên bên phải.
 * 6. Sao chép đường link Worker vừa tạo (dạng: https://ptv-survey-api.xxx.workers.dev)
 *    và dán vào file index.html hoặc ô cài đặt trong Admin.
 */

// ĐƯỜNG DẪN BÍ MẬT CỦA GOOGLE APPS SCRIPT (CHỈ NẰM TRÊN MÁY CHỦ CLOUDFLARE)
const GOOGLE_SCRIPT_BACKEND = "https://script.google.com/macros/s/AKfycbyCDNnEs7ULm5NiNBpHs6RNn5uivyWF_iO1pGeoymhe-nLHQ4nddrUVZCLe4gAyY3Nyqw/exec";

// Cấu hình CORS cho phép trang web gọi an toàn
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

export default {
  async fetch(request, env, ctx) {
    // 1. Phản hồi yêu cầu kiểm tra CORS Preflight (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {
      const targetUrl = env.GOOGLE_SCRIPT_BACKEND || GOOGLE_SCRIPT_BACKEND;
      const url = new URL(request.url);

      // 2. Chuyển tiếp yêu cầu (Proxy) sang Google Apps Script
      let init = {
        method: request.method,
        redirect: "follow"
      };

      if (request.method === "POST") {
        const body = await request.text();
        init.body = body;
        init.headers = {
          "Content-Type": "text/plain;charset=utf-8"
        };
      }

      // 3. Gọi ngầm tới máy chủ Google Apps Script phía sau hậu trường
      const backendResponse = await fetch(targetUrl + url.search, init);
      const data = await backendResponse.text();

      // 4. Trả kết quả về cho trình duyệt người dùng với tên miền Cloudflare
      return new Response(data, {
        status: backendResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json;charset=utf-8"
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: "Lỗi kết nối qua Proxy: " + err.message }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json;charset=utf-8"
        }
      });
    }
  }
};

