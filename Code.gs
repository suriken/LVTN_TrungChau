/**
 * ==============================================================================
 * BACKEND GOOGLE APPS SCRIPT CHO HỆ THỐNG KHẢO SÁT & QUẢN TRỊ PTV
 * Tác giả: Nguyễn Đình Thảo - Khóa đào tạo Phổ Tế Viên Cấp III Trung Châu 1
 * Dự án: Luận Văn Tốt Nghiệp Phổ Tế Viên
 * ==============================================================================
 * 
 * HƯỚNG DẪN CÀI ĐẶT LÊN GOOGLE APPS SCRIPT:
 * 1. Mở Google Sheets của bạn.
 * 2. Bấm vào menu "Tiện ích mở rộng" (Extensions) > "Apps Script".
 * 3. Xóa hết mã cũ trong file Code.gs và dán toàn bộ nội dung file này vào.
 * 4. Bấm biểu tượng Đĩa mềm để Lưu (Save).
 * 5. Bấm nút "Triển khai" (Deploy) > "Quản lý bản triển khai" (Manage deployments).
 * 6. Bấm biểu tượng Bút chì (Edit) > Chọn Phiên bản "Phiên bản mới" (New version).
 * 7. Đảm bảo quyền truy cập (Who has access) là "Bất kỳ ai" (Anyone).
 * 8. Bấm "Triển khai" (Deploy).
 */

// CẤU HÌNH TÀI KHOẢN QUẢN TRỊ BẢO MẬT TRÊN MÁY CHỦ GOOGLE
// (Người dùng thông thường xem F12 ở trình duyệt HTML hoàn toàn KHÔNG THẤY được thông tin này)
var ADMIN_CONFIG = {
  users: ["trungchau", "admin", "dinhthaonguyen1992@gmail.com"],
  passwords: ["trungchau@123", "admin123"]
};

// Khởi tạo hàng tiêu đề (Có thể bấm nút "Chạy" trực tiếp trên giao diện Apps Script)
function setupHeaderIfEmpty(sheet) {
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Mã Phiếu", "Thời Gian", "Họ Tên", "Số Điện Thoại", "Vai Trò",
      "Đơn Vị", "Cấp PTV", "Thâm Niên", "Khu Vực", "Điểm TB",
      "q1_levels", "q2_entry", "q3_duration", "q4_method", "q5_motto", "q6_grad",
      "q7_doctrine", "q8_tradition", "q9_skills_guide", "q10_skills_ceremony", "q11_cultivation", "q12_digital_safety",
      "q13_competence", "q14_application", "q15_commitment",
      "Lý Do Điểm < 3", "Trai Kỳ", "Công Phu", "Phụng Sự", "Rào Cản",
      "Mặt Làm Được", "Mặt Chưa Được", "Thực Trạng PTV", "Đề Xuất Cải Tiến"
    ]);
  }
}

// Hàm hỗ trợ trả về JSON chuẩn kèm CORS cho trình duyệt
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Xử lý yêu cầu GET
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    setupHeaderIfEmpty(sheet);

    if (action === "getResponses") {
      var list = readAllResponsesFromSheet(sheet);
      return createJsonResponse({ success: true, responses: list, total: list.length });
    }
    
    return createJsonResponse({
      success: true,
      message: "PTV Survey Backend Apps Script đang hoạt động ổn định!",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

// Xử lý yêu cầu POST (Submit khảo sát, Đăng nhập Admin, Xóa dữ liệu, Lấy danh sách)
function doPost(e) {
  try {
    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var data = JSON.parse(contents);
    var action = data.action || "submit";
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    setupHeaderIfEmpty(sheet);

    if (action === "login") {
      return handleLogin(data, sheet);
    } else if (action === "getResponses") {
      var list = readAllResponsesFromSheet(sheet);
      return createJsonResponse({ success: true, responses: list, total: list.length });
    } else if (action === "deleteResponse") {
      return handleDeleteResponse(data, sheet);
    } else if (action === "clearAll") {
      return handleClearAll(data, sheet);
    } else if (action === "ping") {
      return createJsonResponse({ success: true, message: "PONG - Kết nối Google Sheet thành công!", timestamp: new Date().toISOString() });
    } else {
      // Mặc định: Ghi nhận phiếu khảo sát gửi lên
      return handleSubmitSurvey(data, sheet);
    }
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

// 1. XỬ LÝ ĐĂNG NHẬP ADMIN TRÊN SERVER
function handleLogin(data, sheet) {
  var u = (data.username || "").toString().trim().toLowerCase();
  var p = (data.password || "").toString().trim();

  var isValidUser = ADMIN_CONFIG.users.indexOf(u) !== -1;
  var isValidPass = ADMIN_CONFIG.passwords.indexOf(p) !== -1;

  if (isValidUser && isValidPass) {
    // Tạo token phiên đăng nhập (bảo mật)
    var rawStr = u + ":" + p + ":" + new Date().toDateString();
    var token = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawStr));
    
    // Tự động lấy danh sách toàn bộ phiếu khảo sát trên Sheet trả về cho Admin Dashboard
    var list = readAllResponsesFromSheet(sheet);
    
    return createJsonResponse({
      success: true,
      token: token,
      message: "Xác thực Quản trị viên thành công!",
      responses: list,
      total: list.length
    });
  } else {
    return createJsonResponse({
      success: false,
      message: "Tên đăng nhập hoặc mật khẩu không chính xác!"
    });
  }
}

// 2. XỬ LÝ LƯU HOẶC GHI ĐÈ PHIẾU KHẢO SÁT VÀO GOOGLE SHEET (ĐẢM BẢO DUY NHẤT MÃ PHIẾU)
function handleSubmitSurvey(data, sheet) {
  var targetId = (data.id || "").toString().trim();
  if (!targetId) {
    targetId = "PTV-" + Math.floor(100000 + Math.random() * 900000);
    data.id = targetId;
  }

  var reasonsStr = "";
  if (data.reasons) {
    try {
      reasonsStr = typeof data.reasons === "string" ? data.reasons : JSON.stringify(data.reasons);
    } catch(e) {}
  }

  var rowData = [
    targetId,
    data.timestamp || new Date().toLocaleString("vi-VN"),
    data.name || "Ẩn danh",
    data.phone || "",
    data.role || "",
    data.unit || "",
    data.gradLevel || "",
    data.tenure || "",
    data.region || "",
    data.avgScore || 0,
    (data.scores ? data.scores.q1_levels : "") || "",
    (data.scores ? data.scores.q2_entry : "") || "",
    (data.scores ? data.scores.q3_duration : "") || "",
    (data.scores ? data.scores.q4_method : "") || "",
    (data.scores ? data.scores.q5_motto : "") || "",
    (data.scores ? data.scores.q6_grad : "") || "",
    (data.scores ? data.scores.q7_doctrine : "") || "",
    (data.scores ? data.scores.q8_tradition : "") || "",
    (data.scores ? data.scores.q9_skills_guide : "") || "",
    (data.scores ? data.scores.q10_skills_ceremony : "") || "",
    (data.scores ? data.scores.q11_cultivation : "") || "",
    (data.scores ? data.scores.q12_digital_safety : "") || "",
    (data.scores ? data.scores.q13_competence : "") || "",
    (data.scores ? data.scores.q14_application : "") || "",
    (data.scores ? data.scores.q15_commitment : "") || "",
    reasonsStr,
    data.diet || "",
    data.practice || "",
    data.serviceStatus || "",
    data.challenge || "",
    data.advantages || "",
    data.disadvantages || "",
    data.reality || "",
    data.suggestions || ""
  ];

  // KIỂM TRA TÍNH DUY NHẤT: Tìm xem Mã Phiếu này đã tồn tại trong cột A chưa
  var lastRow = sheet.getLastRow();
  var existingRowIndex = -1;

  if (lastRow >= 2) {
    var existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < existingIds.length; i++) {
      if (existingIds[i][0] && existingIds[i][0].toString().trim() === targetId) {
        existingRowIndex = i + 2; // Số hàng thực tế trên Sheet
        break;
      }
    }
  }

  if (existingRowIndex !== -1) {
    // NẾU ĐÃ TỒN TẠI (Người dùng quay lại sửa & gửi lại): Ghi đè vào đúng hàng đó
    sheet.getRange(existingRowIndex, 1, 1, rowData.length).setValues([rowData]);
    return createJsonResponse({
      success: true,
      result: "success",
      id: targetId,
      actionTaken: "updated",
      message: "Đã cập nhật (ghi đè) thành công phiếu khảo sát mã " + targetId + " trên Google Sheets!"
    });
  } else {
    // NẾU CHƯA TỒN TẠI: Thêm mới một hàng
    sheet.appendRow(rowData);
    return createJsonResponse({
      success: true,
      result: "success",
      id: targetId,
      actionTaken: "inserted",
      message: "Đã lưu thành công phiếu khảo sát mới mã " + targetId + " vào Google Sheets!"
    });
  }
}

// 3. ĐỌC TẤT CẢ DỮ LIỆU TỪ GOOGLE SHEET
function readAllResponsesFromSheet(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 34).getValues();
  var responses = [];

  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var reasons = {};
    if (r[25]) {
      try {
        var str = r[25].toString().trim();
        if (str.indexOf("{") === 0) {
          reasons = JSON.parse(str);
        }
      } catch(e) {}
    }

    responses.push({
      id: r[0] ? r[0].toString() : "",
      timestamp: r[1] ? r[1].toString() : "",
      name: r[2] ? r[2].toString() : "Ẩn danh",
      phone: r[3] ? r[3].toString() : "",
      role: r[4] ? r[4].toString() : "",
      unit: r[5] ? r[5].toString() : "",
      gradLevel: r[6] ? r[6].toString() : "",
      tenure: r[7] ? r[7].toString() : "",
      region: r[8] ? r[8].toString() : "",
      avgScore: parseFloat(r[9]) || 0,
      scores: {
        q1_levels: parseFloat(r[10]) || 0,
        q2_entry: parseFloat(r[11]) || 0,
        q3_duration: parseFloat(r[12]) || 0,
        q4_method: parseFloat(r[13]) || 0,
        q5_motto: parseFloat(r[14]) || 0,
        q6_grad: parseFloat(r[15]) || 0,
        q7_doctrine: parseFloat(r[16]) || 0,
        q8_tradition: parseFloat(r[17]) || 0,
        q9_skills_guide: parseFloat(r[18]) || 0,
        q10_skills_ceremony: parseFloat(r[19]) || 0,
        q11_cultivation: parseFloat(r[20]) || 0,
        q12_digital_safety: parseFloat(r[21]) || 0,
        q13_competence: parseFloat(r[22]) || 0,
        q14_application: parseFloat(r[23]) || 0,
        q15_commitment: parseFloat(r[24]) || 0
      },
      reasons: reasons,
      diet: r[26] ? r[26].toString() : "",
      practice: r[27] ? r[27].toString() : "",
      serviceStatus: r[28] ? r[28].toString() : "",
      challenge: r[29] ? r[29].toString() : "",
      advantages: r[30] ? r[30].toString() : "",
      disadvantages: r[31] ? r[31].toString() : "",
      reality: r[32] ? r[32].toString() : "",
      suggestions: r[33] ? r[33].toString() : ""
    });
  }
  return responses;
}

// 4. XỬ LÝ XÓA 1 PHIẾU THEO ID TRÊN GOOGLE SHEET
function handleDeleteResponse(data, sheet) {
  var targetId = (data.id || "").toString().trim();
  if (!targetId) {
    return createJsonResponse({ success: false, message: "Thiếu ID phiếu cần xóa!" });
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return createJsonResponse({ success: false, message: "Bảng tính không có dữ liệu!" });
  }

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] && ids[i][0].toString().trim() === targetId) {
      sheet.deleteRow(i + 2);
      return createJsonResponse({ success: true, message: "Đã xóa phiếu " + targetId + " trên Google Sheet!" });
    }
  }

  return createJsonResponse({ success: false, message: "Không tìm thấy mã phiếu " + targetId });
}

// 5. XỬ LÝ XÓA TOÀN BỘ DỮ LIỆU TRÊN GOOGLE SHEET (GIỮ LẠI HÀNG TIÊU ĐỀ)
function handleClearAll(data, sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return createJsonResponse({ success: true, message: "Đã dọn dẹp sạch toàn bộ dữ liệu khảo sát trên Google Sheet!" });
}

