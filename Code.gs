/**
 * ==============================================================================
 * BACKEND GOOGLE APPS SCRIPT CHO HỆ THỐNG KHẢO SÁT & QUẢN TRỊ PTV TRUNG CHÂU 1
 * Tác giả: Nguyễn Đình Thảo - Khóa đào tạo Phổ Tế Viên Cấp III Trung Châu 1
 * Dự án: Luận Văn Tốt Nghiệp Phổ Tế Viên
 * ==============================================================================
 * 
 * BẢNG DỮ LIỆU ĐƯỢC CHUẨN HÓA 48 CỘT TƯỜNG MINH:
 * - 10 cột Thông tin người tham gia & Điểm TB
 * - 30 cột: 15 câu Likert, mỗi câu tách riêng [Điểm] và [Lý do điểm < 3] rõ ràng
 * - 4 cột Thực trạng tu học & phụng sự
 * - 4 cột Ý kiến đóng góp & đề xuất cải tiến
 * - Tự động định dạng hàng tiêu đề màu xanh trang trọng, cố định (Freeze row 1).
 */

// CẤU HÌNH TÀI KHOẢN QUẢN TRỊ BẢO MẬT TRÊN MÁY CHỦ GOOGLE
var ADMIN_CONFIG = {
  users: ["trungchau", "admin", "dinhthaonguyen1992@gmail.com"],
  passwords: ["trungchau@123", "admin123"]
};

// 15 MÃ CÂU HỎI LIKERT
var Q_KEYS = [
  "q1_levels", "q2_entry", "q3_duration", "q4_method", "q5_motto", "q6_grad",
  "q7_doctrine", "q8_tradition", "q9_skills_guide", "q10_skills_ceremony", "q11_cultivation", "q12_digital_safety",
  "q13_competence", "q14_application", "q15_commitment"
];

// DANH SÁCH 48 TIÊU ĐỀ CỘT TƯỜNG MINH (KHÔNG DÙNG TÊN MÃ KHÓ HIỂU)
var SHEET_HEADERS_EXPLICIT = [
  "Mã Phiếu", "Thời Gian Gửi", "Họ Và Tên", "Số Điện Thoại", "Vai Trò Hiện Nay",
  "Đơn Vị Sinh Hoạt", "Cấp PTV Cao Nhất", "Thâm Niên", "Khu Vực", "Điểm Đánh Giá TB",
  "[C01] Điểm: Phân cấp 4 bậc", "[C01] Lý do điểm < 3",
  "[C02] Điểm: Tiêu chuẩn nhập khóa", "[C02] Lý do điểm < 3",
  "[C03] Điểm: Thời lượng khóa học", "[C03] Lý do điểm < 3",
  "[C04] Điểm: Hình thức tổ chức (Hàm thụ & Trại)", "[C04] Lý do điểm < 3",
  "[C05] Điểm: Châm ngôn hành động", "[C05] Lý do điểm < 3",
  "[C06] Điểm: Tiêu chuẩn tốt nghiệp", "[C06] Lý do điểm < 3",
  "[C07] Điểm: Khối Giáo lý & Lễ nghi", "[C07] Lý do điểm < 3",
  "[C08] Điểm: Khối Truyền thống & Tổ chức", "[C08] Lý do điểm < 3",
  "[C09] Điểm: Khối Kỹ năng Hướng dẫn sinh hoạt", "[C09] Lý do điểm < 3",
  "[C10] Điểm: Khối Kỹ năng Phục vụ Lễ nghi", "[C10] Lý do điểm < 3",
  "[C11] Điểm: Khối Hành trì & Tu dưỡng", "[C11] Lý do điểm < 3",
  "[C12] Điểm: Kỹ năng số & An toàn trẻ em", "[C12] Lý do điểm < 3",
  "[C13] Điểm: Năng lực thực tế đầu ra", "[C13] Lý do điểm < 3",
  "[C14] Điểm: Khả năng vận dụng tại Họ đạo", "[C14] Lý do điểm < 3",
  "[C15] Điểm: Tinh thần gắn bó phụng sự lâu dài", "[C15] Lý do điểm < 3",
  "Thực hành trai kỳ", "Duy trì thời cúng & Công phu", "Tình trạng phụng sự hiện nay", "Khó khăn / Rào cản lớn nhất",
  "Mặt làm được (Ưu điểm)", "Mặt chưa được (Hạn chế)", "Thực trạng PTV sau tốt nghiệp", "Đề xuất cải tiến chương trình"
];

// Hàm hỗ trợ trả về JSON chuẩn kèm CORS cho trình duyệt
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Hàm format dòng tiêu đề đẹp mắt trên Google Sheets
function formatHeaderRow(sheet) {
  try {
    var headerRange = sheet.getRange(1, 1, 1, SHEET_HEADERS_EXPLICIT.length);
    headerRange.setBackground("#3b4982")
               .setFontColor("#ffffff")
               .setFontWeight("bold")
               .setFontFamily("Roboto")
               .setHorizontalAlignment("center")
               .setVerticalAlignment("middle")
               .setWrap(true);
    sheet.setRowHeight(1, 42);
    sheet.setFrozenRows(1);
  } catch(e) {}
}

// Tạo 1 hàng dữ liệu 48 cột từ đối tượng phiếu gửi lên
function buildRowData(data) {
  var s = data.scores || {};
  var r = data.reasons || {};

  var row = [
    data.id || ("PTV-" + Math.floor(100000 + Math.random() * 900000)),
    data.timestamp || new Date().toLocaleString("vi-VN"),
    data.name || "Ẩn danh",
    data.phone || "",
    data.role || "",
    data.unit || "",
    data.gradLevel || "",
    data.tenure || "",
    data.region || "",
    parseFloat(data.avgScore) || 0
  ];

  for (var i = 0; i < Q_KEYS.length; i++) {
    var k = Q_KEYS[i];
    var scoreVal = (s[k] !== undefined && s[k] !== null && s[k] !== "") ? s[k] : "";
    var reasonVal = (r[k] !== undefined && r[k] !== null) ? r[k].toString().trim() : "";
    row.push(scoreVal);
    row.push(reasonVal);
  }

  row.push(data.diet || "");
  row.push(data.practice || "");
  row.push(data.serviceStatus || "");
  row.push(data.challenge || "");

  row.push(data.advantages || "");
  row.push(data.disadvantages || "");
  row.push(data.reality || "");
  row.push(data.suggestions || "");

  return row;
}

// Nâng cấp tự động bảng tính cũ (34 cột, JSON ở cột Z) sang chuẩn 48 cột rõ ràng
function upgradeSheetToExplicitHeaders(sheet) {
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  }
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0) {
    sheet.appendRow(SHEET_HEADERS_EXPLICIT);
    formatHeaderRow(sheet);
    return;
  }

  var firstCellH11 = (lastCol >= 11) ? sheet.getRange(1, 11).getValue().toString().trim() : "";
  if (firstCellH11.indexOf("q1") === 0 || lastCol < 48) {
    var oldValues = [];
    if (lastRow >= 2) {
      oldValues = sheet.getRange(2, 1, lastRow - 1, Math.max(lastCol, 34)).getValues();
    }

    var newMatrix = [];
    for (var i = 0; i < oldValues.length; i++) {
      var oldRow = oldValues[i];
      var oldReasons = {};
      if (oldRow[25]) {
        try {
          var str = oldRow[25].toString().trim();
          if (str.indexOf("{") === 0) oldReasons = JSON.parse(str);
        } catch(e) {}
      }

      var rowItem = {
        id: oldRow[0],
        timestamp: oldRow[1],
        name: oldRow[2],
        phone: oldRow[3],
        role: oldRow[4],
        unit: oldRow[5],
        gradLevel: oldRow[6],
        tenure: oldRow[7],
        region: oldRow[8],
        avgScore: oldRow[9],
        scores: {},
        reasons: oldReasons,
        diet: oldRow[26],
        practice: oldRow[27],
        serviceStatus: oldRow[28],
        challenge: oldRow[29],
        advantages: oldRow[30],
        disadvantages: oldRow[31],
        reality: oldRow[32],
        suggestions: oldRow[33]
      };

      for (var k = 0; k < Q_KEYS.length; k++) {
        rowItem.scores[Q_KEYS[k]] = oldRow[10 + k];
      }

      newMatrix.push(buildRowData(rowItem));
    }

    sheet.clearContents();
    sheet.getRange(1, 1, 1, SHEET_HEADERS_EXPLICIT.length).setValues([SHEET_HEADERS_EXPLICIT]);
    if (newMatrix.length > 0) {
      sheet.getRange(2, 1, newMatrix.length, SHEET_HEADERS_EXPLICIT.length).setValues(newMatrix);
    }
    formatHeaderRow(sheet);
  }
}

// Khởi tạo hàng tiêu đề nếu bảng tính trống hoặc tự động nâng cấp nếu đang dùng chuẩn cũ
function setupHeaderIfEmpty(sheet) {
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SHEET_HEADERS_EXPLICIT);
    formatHeaderRow(sheet);
  } else {
    var c11 = (sheet.getLastColumn() >= 11) ? sheet.getRange(1, 11).getValue().toString().trim() : "";
    if (c11.indexOf("q1") === 0 || sheet.getLastColumn() < 48) {
      upgradeSheetToExplicitHeaders(sheet);
    }
  }
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
      message: "Máy chủ khảo sát PTV đang hoạt động ổn định!",
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
    } else if (action === "upgradeHeaders") {
      upgradeSheetToExplicitHeaders(sheet);
      return createJsonResponse({ success: true, message: "Đã nâng cấp bảng tính lên 48 cột tường minh thành công!" });
    } else if (action === "ping") {
      return createJsonResponse({ success: true, message: "PONG - Kết nối máy chủ thành công!", timestamp: new Date().toISOString() });
    } else {
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
    var rawStr = u + ":" + p + ":" + new Date().toDateString();
    var token = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawStr));
    
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

// 2. XỬ LÝ LƯU HOẶC GHI ĐÈ PHIẾU KHẢO SÁT VÀO GOOGLE SHEET (48 CỘT TƯỜNG MINH)
function handleSubmitSurvey(data, sheet) {
  var targetId = (data.id || "").toString().trim();
  if (!targetId) {
    targetId = "PTV-" + Math.floor(100000 + Math.random() * 900000);
    data.id = targetId;
  }

  var rowData = buildRowData(data);
  var lastRow = sheet.getLastRow();
  var existingRowIndex = -1;

  if (lastRow >= 2) {
    var existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < existingIds.length; i++) {
      if (existingIds[i][0] && existingIds[i][0].toString().trim() === targetId) {
        existingRowIndex = i + 2;
        break;
      }
    }
  }

  if (existingRowIndex !== -1) {
    sheet.getRange(existingRowIndex, 1, 1, rowData.length).setValues([rowData]);
    return createJsonResponse({
      success: true,
      result: "success",
      id: targetId,
      actionTaken: "updated",
      message: "Đã cập nhật (ghi đè) thành công phiếu khảo sát mã " + targetId + " trên hệ thống!"
    });
  } else {
    sheet.appendRow(rowData);
    return createJsonResponse({
      success: true,
      result: "success",
      id: targetId,
      actionTaken: "inserted",
      message: "Đã lưu thành công phiếu khảo sát mới mã " + targetId + " vào hệ thống!"
    });
  }
}

// 3. ĐỌC TẤT CẢ DỮ LIỆU TỪ GOOGLE SHEET (HỖ TRỢ CẢ 48 CỘT VÀ 34 CỘT)
function readAllResponsesFromSheet(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var lastCol = sheet.getLastColumn();
  var is48 = (lastCol >= 48);
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var responses = [];

  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var scores = {};
    var reasons = {};

    if (is48) {
      for (var k = 0; k < Q_KEYS.length; k++) {
        var qk = Q_KEYS[k];
        scores[qk] = parseFloat(r[10 + k * 2]) || 0;
        var rVal = r[10 + k * 2 + 1] ? r[10 + k * 2 + 1].toString().trim() : "";
        if (rVal) reasons[qk] = rVal;
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
        scores: scores,
        reasons: reasons,
        diet: r[40] ? r[40].toString() : "",
        practice: r[41] ? r[41].toString() : "",
        serviceStatus: r[42] ? r[42].toString() : "",
        challenge: r[43] ? r[43].toString() : "",
        advantages: r[44] ? r[44].toString() : "",
        disadvantages: r[45] ? r[45].toString() : "",
        reality: r[46] ? r[46].toString() : "",
        suggestions: r[47] ? r[47].toString() : ""
      });
    } else {
      if (r[25]) {
        try {
          var str = r[25].toString().trim();
          if (str.indexOf("{") === 0) reasons = JSON.parse(str);
        } catch(e) {}
      }
      for (var k2 = 0; k2 < Q_KEYS.length; k2++) {
        scores[Q_KEYS[k2]] = parseFloat(r[10 + k2]) || 0;
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
        scores: scores,
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
      return createJsonResponse({ success: true, message: "Đã xóa phiếu " + targetId + " trên hệ thống!" });
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
  return createJsonResponse({ success: true, message: "Đã dọn dẹp sạch toàn bộ dữ liệu khảo sát trên hệ thống!" });
}
