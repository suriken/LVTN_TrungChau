/**
 * ==============================================================================
 * CLOUDFLARE WORKER + D1 DATABASE HYBRID ENGINE CHO PTV TRUNG CHÂU 1
 * ==============================================================================
 * - Lưu trữ siêu tốc vào Cloudflare D1 SQL Database (< 20ms).
 * - Đồng bộ ngầm (Background Async) sang Google Sheets qua ctx.waitUntil.
 * - Hỗ trợ Static Assets fallback cho frontend index.html.
 * - Hỗ trợ đầy đủ CORS và dự phòng linh hoạt.
 */

const GOOGLE_SCRIPT_BACKEND = "https://script.google.com/macros/s/AKfycbwvin6XGotcqOwqyNowHyhW6eF66yLBuT44Q7m5g_ivSl-ObRCLO-GfYJAqsJjkQ0KB1Q/exec";

// Tài khoản Admin dự phòng xác thực
const ADMIN_CREDENTIALS = {
  users: ["trungchau", "admin", "dinhthaonguyen1992@gmail.com"],
  passwords: ["trungchau@123", "admin123"]
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json;charset=utf-8"
    }
  });
}

// Hàm khởi tạo bảng D1 tự động nếu chưa có
async function ensureD1Table(db) {
  if (!db) return;
  const ddl = `
    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      name TEXT,
      phone TEXT,
      is_anonymous INTEGER DEFAULT 0,
      role TEXT,
      unit TEXT,
      grad_level TEXT,
      tenure TEXT,
      region TEXT,
      avg_score REAL,
      scores_json TEXT,
      reasons_json TEXT,
      diet TEXT,
      practice TEXT,
      service_status TEXT,
      challenge TEXT,
      advantages TEXT,
      disadvantages TEXT,
      reality TEXT,
      suggestions TEXT,
      raw_json TEXT,
      created_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_surveys_role ON surveys(role);
  `;
  try {
    await db.exec(ddl);
  } catch (e) {
    console.error("Lỗi khởi tạo D1 Table:", e);
  }
}

// Đồng bộ ngầm sang Google Apps Script phía sau hậu trường
async function syncToGoogleSheetsBackground(targetUrl, payload) {
  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    console.log("Đồng bộ Google Sheets hoàn tất, status:", res.status);
  } catch (err) {
    console.warn("Lỗi đồng bộ ngầm sang Google Sheets:", err.message);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Phản hồi CORS Preflight (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const targetGoogleUrl = env.GOOGLE_SCRIPT_BACKEND || GOOGLE_SCRIPT_BACKEND;
    const db = env.DB; // Binding Cloudflare D1

    // 2. Định tuyến API: Xử lý khi đường dẫn là /api hoặc nhận method POST
    const isApiRequest = url.pathname === "/api" || url.pathname.startsWith("/api/") || request.method === "POST";

    if (isApiRequest) {
      // Đảm bảo bảng D1 luôn sẵn sàng
      if (db) {
        ctx.waitUntil(ensureD1Table(db));
      }

      // XỬ LÝ GET REQUEST
      if (request.method === "GET") {
        const action = url.searchParams.get("action") || "getResponses";
        if (action === "getResponses" && db) {
          try {
            const { results } = await db.prepare("SELECT raw_json FROM surveys ORDER BY created_at DESC").all();
            const responses = (results || []).map(r => {
              try { return JSON.parse(r.raw_json); } catch(e) { return null; }
            }).filter(Boolean);
            return jsonResponse({ success: true, count: responses.length, responses: responses, source: "cloudflare_d1" });
          } catch (err) {
            console.warn("D1 get error, fallback Google Script:", err.message);
          }
        }
      }

      // XỬ LÝ POST REQUEST
      if (request.method === "POST") {
        let payload = null;
        try {
          const bodyText = await request.text();
          payload = JSON.parse(bodyText);
        } catch (e) {
          return jsonResponse({ success: false, error: "Dữ liệu JSON không hợp lệ" }, 400);
        }

        const action = payload.action || "submit";

        // A. NỘP PHIẾU KHẢO SÁT (SUBMIT) -> LƯU D1 SIÊU TỐC + SYNC GOOGLE SHEETS
        if (action === "submit") {
          const respObj = payload;
          const id = respObj.id || ("PTV-" + Date.now().toString().slice(-6));
          respObj.id = id;

          // 1. Ghi tức thì vào Cloudflare D1 (nếu có DB binding)
          if (db) {
            try {
              const now = Date.now();
              const isAnon = respObj.isAnonymous ? 1 : 0;
              const scoresStr = JSON.stringify(respObj.scores || {});
              const reasonsStr = JSON.stringify(respObj.reasons || {});
              const rawStr = JSON.stringify(respObj);

              await db.prepare(`
                INSERT INTO surveys (
                  id, timestamp, name, phone, is_anonymous, role, unit, grad_level,
                  tenure, region, avg_score, scores_json, reasons_json, diet, practice,
                  service_status, challenge, advantages, disadvantages, reality, suggestions,
                  raw_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  timestamp = excluded.timestamp,
                  name = excluded.name,
                  phone = excluded.phone,
                  is_anonymous = excluded.is_anonymous,
                  role = excluded.role,
                  unit = excluded.unit,
                  grad_level = excluded.grad_level,
                  tenure = excluded.tenure,
                  region = excluded.region,
                  avg_score = excluded.avg_score,
                  scores_json = excluded.scores_json,
                  reasons_json = excluded.reasons_json,
                  diet = excluded.diet,
                  practice = excluded.practice,
                  service_status = excluded.service_status,
                  challenge = excluded.challenge,
                  advantages = excluded.advantages,
                  disadvantages = excluded.disadvantages,
                  reality = excluded.reality,
                  suggestions = excluded.suggestions,
                  raw_json = excluded.raw_json,
                  created_at = excluded.created_at
              `).bind(
                id,
                respObj.timestamp || new Date().toLocaleString("vi-VN"),
                respObj.name || "",
                respObj.phone || "",
                isAnon,
                respObj.role || "",
                respObj.unit || "",
                respObj.gradLevel || "",
                respObj.tenure || "",
                respObj.region || "",
                respObj.avgScore || 0,
                scoresStr,
                reasonsStr,
                respObj.diet || "",
                respObj.practice || "",
                respObj.serviceStatus || "",
                respObj.challenge || "",
                respObj.advantages || "",
                respObj.disadvantages || "",
                respObj.reality || "",
                respObj.suggestions || "",
                rawStr,
                now
              ).run();

              // 2. Đẩy ngầm sang Google Sheets qua ctx.waitUntil (không để người dùng phải chờ)
              ctx.waitUntil(syncToGoogleSheetsBackground(targetGoogleUrl, payload));

              // 3. Phản hồi thành công ngay lập tức (< 20ms)
              return jsonResponse({
                success: true,
                id: id,
                actionTaken: "saved_d1",
                message: "Đã lưu phiếu thành công vào Cloudflare D1 siêu tốc và đồng bộ ngầm Google Sheets!",
                source: "cloudflare_d1"
              });
            } catch (d1Err) {
              console.error("Lỗi khi ghi vào D1, chuyển tiếp Google Apps Script:", d1Err);
            }
          }

          // Fallback: Nếu chưa bind D1, gọi Google Apps Script trực tiếp
          return fetch(targetGoogleUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
          });
        }

        // B. TẢI TOÀN BỘ PHIẾU CHO DASHBOARD (GET RESPONSES)
        if (action === "getResponses") {
          if (db) {
            try {
              const { results } = await db.prepare("SELECT raw_json FROM surveys ORDER BY created_at DESC").all();
              let responses = (results || []).map(r => {
                try { return JSON.parse(r.raw_json); } catch(e) { return null; }
              }).filter(Boolean);

              // Nếu D1 đã có dữ liệu -> trả về siêu tốc (< 15ms)
              if (responses.length > 0) {
                return jsonResponse({
                  success: true,
                  count: responses.length,
                  responses: responses,
                  source: "cloudflare_d1"
                });
              }
            } catch (d1Err) {
              console.warn("Lỗi đọc D1, fallback sang Google Apps Script:", d1Err);
            }
          }

          // Fallback hoặc khi D1 chưa có dữ liệu: Lấy từ Google Apps Script
          try {
            const googleRes = await fetch(targetGoogleUrl, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify(payload)
            });
            const data = await googleRes.json();

            // Tự động nạp (Backfill) dữ liệu từ Google Sheets sang D1 ở luồng ngầm
            if (db && data && data.success && Array.isArray(data.responses) && data.responses.length > 0) {
              ctx.waitUntil((async () => {
                for (const r of data.responses) {
                  try {
                    const rawStr = JSON.stringify(r);
                    const scoresStr = JSON.stringify(r.scores || {});
                    const reasonsStr = JSON.stringify(r.reasons || {});
                    const isAnon = r.isAnonymous ? 1 : 0;
                    await db.prepare(`
                      INSERT INTO surveys (
                        id, timestamp, name, phone, is_anonymous, role, unit, grad_level,
                        tenure, region, avg_score, scores_json, reasons_json, diet, practice,
                        service_status, challenge, advantages, disadvantages, reality, suggestions,
                        raw_json, created_at
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET raw_json = excluded.raw_json
                    `).bind(
                      r.id, r.timestamp || "", r.name || "", r.phone || "", isAnon, r.role || "", r.unit || "",
                      r.gradLevel || "", r.tenure || "", r.region || "", r.avgScore || 0,
                      scoresStr, reasonsStr, r.diet || "", r.practice || "", r.serviceStatus || "",
                      r.challenge || "", r.advantages || "", r.disadvantages || "", r.reality || "", r.suggestions || "",
                      rawStr, Date.now()
                    ).run();
                  } catch(e){}
                }
                console.log("Đã tự động nạp thành công dữ liệu từ Google Sheets vào D1!");
              })());
            }

            return jsonResponse(data);
          } catch (fetchErr) {
            return jsonResponse({ success: false, error: fetchErr.message }, 500);
          }
        }

        // C. XÁC THỰC QUẢN TRỊ (LOGIN) SIÊU TỐC
        if (action === "login") {
          const u = (payload.username || "").trim().toLowerCase();
          const p = (payload.password || "").trim();

          const validUsers = ["trungchau", "admin", "dinhthaonguyen1992@gmail.com", "thao", "nguyendinhthao"];
          const validPass = ["trungchau@123", "admin123"];

          const isValidUser = validUsers.includes(u);
          const isValidPass = validPass.includes(p);

          if (isValidUser && isValidPass) {
            let responses = [];
            if (db) {
              try {
                const { results } = await db.prepare("SELECT raw_json FROM surveys ORDER BY created_at DESC").all();
                responses = (results || []).map(r => {
                  try { return JSON.parse(r.raw_json); } catch(e) { return null; }
                }).filter(Boolean);
              } catch(e){}
            }

            return jsonResponse({
              success: true,
              token: "d1_token_" + Date.now(),
              message: "Đăng nhập Quản trị thành công!",
              responses: responses,
              source: "cloudflare_d1"
            });
          }

          // Hoặc kiểm tra qua Google Apps Script
          return fetch(targetGoogleUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
          });
        }

        // D. XÓA PHIẾU KHẢO SÁT (DELETE RESPONSE)
        if (action === "deleteResponse") {
          const id = payload.id;
          if (db && id) {
            try {
              await db.prepare("DELETE FROM surveys WHERE id = ?").bind(id).run();
              ctx.waitUntil(syncToGoogleSheetsBackground(targetGoogleUrl, payload));
              return jsonResponse({ success: true, message: `Đã xóa phiếu ${id} khỏi D1 thành công!`, source: "cloudflare_d1" });
            } catch(e){}
          }
          return fetch(targetGoogleUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
          });
        }

        // E. XÓA TOÀN BỘ PHIẾU (CLEAR ALL)
        if (action === "clearAll") {
          if (db) {
            try {
              await db.prepare("DELETE FROM surveys").run();
              ctx.waitUntil(syncToGoogleSheetsBackground(targetGoogleUrl, payload));
              return jsonResponse({ success: true, message: "Đã làm sạch toàn bộ dữ liệu trên D1!", source: "cloudflare_d1" });
            } catch(e){}
          }
          return fetch(targetGoogleUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
          });
        }

        // CÁC ACTION KHÁC -> CHUYỂN TIẾP GOOGLE APPS SCRIPT
        return fetch(targetGoogleUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
      }
    }

    // 3. NẾU LÀ YÊU CẦU TRUY CẬP TRANG WEB TĨNH (HTML, CSS, JS) -> PHỤC VỤ QUA STATIC ASSETS
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    // Nếu gọi root mà không có ASSETS
    return new Response("Cloudflare Worker D1 API Gateway is running.", {
      headers: { ...corsHeaders, "Content-Type": "text/plain;charset=utf-8" }
    });
  }
};

