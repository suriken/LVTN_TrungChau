/**
 * ==============================================================================
 * BACKEND GOOGLE APPS SCRIPT CHO HỆ THỐNG KHẢO SÁT & QUẢN TRỊ PTV TRUNG CHÂU 1
 * Tác giả: Nguyễn Đình Thảo - Khóa đào tạo Phổ Tế Viên Cấp III Trung Châu 1
 * Dự án: Luận Văn Tốt Nghiệp Phổ Tế Viên
 * ==============================================================================
 * 
 * BẢNG DỮ LIỆU ĐƯỢC CHUẨN HÓA 54 CỘT TƯỜNG MINH:
 * - 10 cột Thông tin người tham gia & Điểm TB
 * - 36 cột: 18 câu Likert (4 Trụ Cột), mỗi câu tách riêng [Điểm] và [Lý do điểm < 3] rõ ràng
 * - 4 cột Thực trạng tu học & phụng sự
 * - 4 cột Ý kiến đóng góp & đề xuất cải tiến
 * - Tự động định dạng hàng tiêu đề màu xanh trang trọng, cố định (Freeze row 1).
 */

// CẤU HÌNH TÀI KHOẢN QUẢN TRỊ BẢO MẬT TRÊN MÁY CHỦ GOOGLE
var ADMIN_CONFIG = {
  users: ["trungchau", "admin", "dinhthaonguyen1992@gmail.com"],
  passwords: ["trungchau@123", "admin123"]
};

/**
 * HÀM NÂNG CẤP BẢNG TÍNH GOOGLE SHEETS LÊN 54 CỘT (CHẠY TRỰC TIẾP TRÊN APPS SCRIPT)
 * Hướng dẫn: Chọn hàm "NANG_CAP_BANG_TINH_54_COT" trong danh sách hàm ở thanh công cụ phía trên và nhấn nút "Chạy" (Run).
 * Bảng tính sẽ tự động thêm Câu 16, Câu 17, Câu 18 và chuyển đổi dữ liệu an toàn 100%.
 */
function NANG_CAP_BANG_TINH_54_COT() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  upgradeSheetToExplicitHeaders(sheet);
  Logger.log(">>> ĐÃ NÂNG CẤP GOOGLE SHEET LÊN 54 CỘT TƯỜNG MINH THÀNH CÔNG! <<<");
}

// 18 MÃ CÂU HỎI LIKERT (4 TRỤ CỘT)
var Q_KEYS = [
  "q1_levels", "q2_entry", "q3_duration", "q4_method", "q5_motto", "q6_grad",
  "q7_doctrine", "q8_tradition", "q9_skills_guide", "q10_skills_ceremony", "q11_cultivation", "q12_digital_safety",
  "q13_competence", "q14_application", "q15_commitment",
  "q16_psychology", "q17_church_needs", "q18_social_context"
];

// DANH SÁCH 54 TIÊU ĐỀ CỘT TƯỜNG MINH (KHÔNG DÙNG TÊN MÃ KHÓ HIỂU)
var SHEET_HEADERS_EXPLICIT = [
  "Mã Phiếu", "Thời Gian Gửi", "Họ Và Tên", "Số Điện Thoại", "Vai Trò Hiện Nay",
  "Đơn Vị Sinh Hoạt", "Cấp PTV Cao Nhất", "Thâm Niên", "Khu Vực", "Điểm Đánh Giá TB",
  "[C01] Điểm: Phân cấp 4 bậc", "[C01] Lý do điểm < 3",
  "[C02] Điểm: Tiêu chuẩn nhập khóa", "[C02] Lý do điểm < 3",
  "[C03] Điểm: Thời lượng khóa học", "[C03] Lý do điểm < 3",
  "[C04] Điểm: Hình thức tổ chức (Hàm thụ & Trại)", "[C04] Lý do điểm < 3",
  "[C05] Điểm: Tinh thần chấp nhận đào tạo & Tên khóa", "[C05] Lý do điểm < 3",
  "[C06] Điểm: Tiêu chuẩn tốt nghiệp", "[C06] Lý do điểm < 3",
  "[C07] Điểm: Khối I - Giáo lý & Lễ nghi", "[C07] Lý do điểm < 3",
  "[C08] Điểm: Khối II - Truyền thống & Tổ chức", "[C08] Lý do điểm < 3",
  "[C09] Điểm: Khối III - Kỹ năng Hướng dẫn sinh hoạt", "[C09] Lý do điểm < 3",
  "[C10] Điểm: Khối IV - Kỹ năng Phục vụ Lễ nghi", "[C10] Lý do điểm < 3",
  "[C11] Điểm: Khối V - Hành trì & Tu dưỡng", "[C11] Lý do điểm < 3",
  "[C12] Điểm: Khối VI - Kỹ năng số & An toàn trẻ em", "[C12] Lý do điểm < 3",
  "[C13] Điểm: Năng lực thực tế đầu ra", "[C13] Lý do điểm < 3",
  "[C14] Điểm: Khả năng vận dụng tại Họ đạo", "[C14] Lý do điểm < 3",
  "[C15] Điểm: Tinh thần gắn bó phụng sự lâu dài", "[C15] Lý do điểm < 3",
  "[C16] Điểm: Phù hợp độ tuổi & Tâm sinh lý", "[C16] Lý do điểm < 3",
  "[C17] Điểm: Đáp ứng nhu cầu thực tế Giáo hội", "[C17] Lý do điểm < 3",
  "[C18] Điểm: Thích ứng bối cảnh xã hội & Tương lai", "[C18] Lý do điểm < 3",
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

// Tạo 1 hàng dữ liệu 54 cột chuẩn từ đối tượng phiếu
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

  // 18 câu hỏi Likert x 2 cột = 36 cột ([Điểm] và [Lý do điểm < 3])
  for (var i = 0; i < Q_KEYS.length; i++) {
    var k = Q_KEYS[i];
    var scoreVal = (s[k] !== undefined && s[k] !== null && s[k] !== "") ? s[k] : "";
    var reasonVal = (r[k] !== undefined && r[k] !== null) ? r[k].toString().trim() : "";
    row.push(scoreVal);
    row.push(reasonVal);
  }

  // 4 cột Tu học & Phụng sự
  row.push(data.diet || "");
  row.push(data.practice || "");
  row.push(data.serviceStatus || "");
  row.push(data.challenge || "");

  // 4 cột Ý kiến định tính
  row.push(data.advantages || "");
  row.push(data.disadvantages || "");
  row.push(data.reality || "");
  row.push(data.suggestions || "");

  return row;
}

/**
 * TỰ ĐỘNG PHÂN TÍCH VÀ NHẬN DIỆN MỌI ĐỊNH DẠNG HÀNG DỮ LIỆU TỪ GOOGLE SHEET:
 * - Định dạng 34 cột cũ (15 điểm liên tiếp, JSON reasons ở col 26, Tu học từ col 27)
 * - Định dạng 48 cột cũ (15 câu x 2 cột Điểm/Lý do, Tu học từ col 41)
 * - Định dạng 54 cột chuẩn mới (18 câu x 2 cột Điểm/Lý do, Tu học từ col 47)
 */
function parseRowAuto(r) {
  if (!r || r.length < 10) return null;

  var id = r[0] ? r[0].toString().trim() : "";
  if (!id) return null;

  var timestamp = r[1] ? r[1].toString().trim() : "";
  var name = r[2] ? r[2].toString().trim() : "Ẩn danh";
  var phone = r[3] ? r[3].toString().trim() : "";
  var role = r[4] ? r[4].toString().trim() : "";
  var unit = r[5] ? r[5].toString().trim() : "";
  var gradLevel = r[6] ? r[6].toString().trim() : "";
  var tenure = r[7] ? r[7].toString().trim() : "";
  var region = r[8] ? r[8].toString().trim() : "";
  var avgScore = parseFloat(r[9]) || 0;

  var scores = {};
  var reasons = {};
  var diet = "", practice = "", serviceStatus = "", challenge = "";
  var advantages = "", disadvantages = "", reality = "", suggestions = "";

  // DẤU HIỆU ĐỊNH DANH 34 CỘT CŨ:
  // Cột index 25 là chuỗi JSON "{...}" hoặc "{}"
  // Hoặc cột index 26 chứa từ khóa tu học "trai", "chay" (vd: "Thập trai", "Lục trai", "Chay trường")
  // Hoặc cột index 28 chứa từ khóa phụng sự "phụng sự", "Trực tiếp", "Thỉnh thoảng"
  var col25Str = (r[25] !== undefined && r[25] !== null) ? r[25].toString().trim() : "";
  var col26Str = (r[26] !== undefined && r[26] !== null) ? r[26].toString().trim() : "";
  var col28Str = (r[28] !== undefined && r[28] !== null) ? r[28].toString().trim() : "";

  var isOld34 = false;
  if (col25Str.indexOf("{") === 0 || 
      col26Str.indexOf("trai") !== -1 || col26Str.indexOf("chay") !== -1 ||
      col28Str.indexOf("phụng sự") !== -1 || col28Str.indexOf("Trực tiếp") !== -1) {
    isOld34 = true;
  }

  // DẤU HIỆU ĐỊNH DANH 48 CỘT CŨ (15 câu x 2 = 30 + 10 meta = 40):
  var isOld48 = false;
  if (!isOld34) {
    var col40Str = (r[40] !== undefined && r[40] !== null) ? r[40].toString().trim() : "";
    var col42Str = (r[42] !== undefined && r[42] !== null) ? r[42].toString().trim() : "";
    if (col40Str.indexOf("trai") !== -1 || col40Str.indexOf("chay") !== -1 ||
        col42Str.indexOf("phụng sự") !== -1 || col42Str.indexOf("Trực tiếp") !== -1) {
      isOld48 = true;
    }
  }

  if (isOld34) {
    // 34 CỘT CŨ: 15 điểm liên tiếp từ r[10] đến r[24]
    for (var k34 = 0; k34 < 15; k34++) {
      var qk34 = Q_KEYS[k34];
      var sVal34 = parseFloat(r[10 + k34]);
      if (!isNaN(sVal34) && sVal34 >= 1 && sVal34 <= 5) {
        scores[qk34] = sVal34;
      } else {
        scores[qk34] = "";
      }
    }
    // Câu 16, 17, 18 chưa có trong phiếu 34 cột cũ -> để trống
    scores["q16_psychology"] = "";
    scores["q17_church_needs"] = "";
    scores["q18_social_context"] = "";

    // Parse reasons JSON từ col 26 (index 25)
    if (col25Str.indexOf("{") === 0) {
      try {
        var parsedReasons = JSON.parse(col25Str);
        if (parsedReasons && typeof parsedReasons === "object") {
          for (var rk in parsedReasons) {
            reasons[rk] = parsedReasons[rk];
          }
        }
      } catch(e) {}
    }

    diet = r[26] ? r[26].toString().trim() : "";
    practice = r[27] ? r[27].toString().trim() : "";
    serviceStatus = r[28] ? r[28].toString().trim() : "";
    challenge = r[29] ? r[29].toString().trim() : "";

    advantages = r[30] ? r[30].toString().trim() : "";
    disadvantages = r[31] ? r[31].toString().trim() : "";
    reality = r[32] ? r[32].toString().trim() : "";
    suggestions = r[33] ? r[33].toString().trim() : "";

  } else if (isOld48) {
    // 48 CỘT CŨ: 15 câu x 2 cột (Điểm, Lý do) từ r[10] đến r[39]
    for (var k48 = 0; k48 < 15; k48++) {
      var qk48 = Q_KEYS[k48];
      var sVal48 = parseFloat(r[10 + k48 * 2]);
      if (!isNaN(sVal48) && sVal48 >= 1 && sVal48 <= 5) {
        scores[qk48] = sVal48;
      } else {
        scores[qk48] = "";
      }
      var rVal48 = (r[10 + k48 * 2 + 1] !== undefined && r[10 + k48 * 2 + 1] !== null) ? r[10 + k48 * 2 + 1].toString().trim() : "";
      if (rVal48) reasons[qk48] = rVal48;
    }
    scores["q16_psychology"] = "";
    scores["q17_church_needs"] = "";
    scores["q18_social_context"] = "";

    diet = r[40] ? r[40].toString().trim() : "";
    practice = r[41] ? r[41].toString().trim() : "";
    serviceStatus = r[42] ? r[42].toString().trim() : "";
    challenge = r[43] ? r[43].toString().trim() : "";

    advantages = r[44] ? r[44].toString().trim() : "";
    disadvantages = r[45] ? r[45].toString().trim() : "";
    reality = r[46] ? r[46].toString().trim() : "";
    suggestions = r[47] ? r[47].toString().trim() : "";

  } else {
    // 54 CỘT CHUẨN MỚI: 18 câu x 2 cột (Điểm, Lý do) từ r[10] đến r[45]
    for (var k54 = 0; k54 < 18; k54++) {
      var qk54 = Q_KEYS[k54];
      var rawScore = r[10 + k54 * 2];
      var sVal54 = (rawScore !== undefined && rawScore !== null && rawScore !== "") ? parseFloat(rawScore) : NaN;
      if (!isNaN(sVal54) && sVal54 >= 1 && sVal54 <= 5) {
        scores[qk54] = sVal54;
      } else {
        scores[qk54] = "";
      }
      var rVal54 = (r[10 + k54 * 2 + 1] !== undefined && r[10 + k54 * 2 + 1] !== null) ? r[10 + k54 * 2 + 1].toString().trim() : "";
      if (rVal54) reasons[qk54] = rVal54;
    }

    diet = r[46] ? r[46].toString().trim() : "";
    practice = r[47] ? r[47].toString().trim() : "";
    serviceStatus = r[48] ? r[48].toString() : "";
    challenge = r[49] ? r[49].toString() : "";

    advantages = r[50] ? r[50].toString() : "";
    disadvantages = r[51] ? r[51].toString() : "";
    reality = r[52] ? r[52].toString() : "";
    suggestions = r[53] ? r[53].toString() : "";
  }

  return {
    id: id,
    timestamp: timestamp,
    name: name,
    phone: phone,
    role: role,
    unit: unit,
    gradLevel: gradLevel,
    tenure: tenure,
    region: region,
    avgScore: avgScore,
    scores: scores,
    reasons: reasons,
    diet: diet,
    practice: practice,
    serviceStatus: serviceStatus,
    challenge: challenge,
    advantages: advantages,
    disadvantages: disadvantages,
    reality: reality,
    suggestions: suggestions
  };
}

// Nâng cấp & tái căn chỉnh toàn diện bảng tính sang chuẩn 54 cột tường minh
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

  var maxCol = Math.max(lastCol, 54);
  var allValues = sheet.getRange(1, 1, lastRow, maxCol).getValues();
  var newMatrix = [];

  for (var i = 1; i < allValues.length; i++) {
    var oldRow = allValues[i];
    if (!oldRow[0] || oldRow[0].toString().trim() === "") continue;

    var rowItem = parseRowAuto(oldRow);
    if (rowItem) {
      newMatrix.push(buildRowData(rowItem));
    }
  }

  sheet.clearContents();
  sheet.getRange(1, 1, 1, SHEET_HEADERS_EXPLICIT.length).setValues([SHEET_HEADERS_EXPLICIT]);
  if (newMatrix.length > 0) {
    sheet.getRange(2, 1, newMatrix.length, SHEET_HEADERS_EXPLICIT.length).setValues(newMatrix);
  }
  formatHeaderRow(sheet);
  Logger.log(">>> ĐÃ NÂNG CẤP VÀ ĐỒNG BỘ CHÍNH XÁC " + newMatrix.length + " HÀNG DỮ LIỆU SANG 54 CỘT TƯỜNG MINH! <<<");
}

// Khởi tạo hàng tiêu đề nếu bảng tính trống hoặc tự động nâng cấp nếu phát hiện dữ liệu cũ chưa căn chỉnh
function setupHeaderIfEmpty(sheet) {
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

  // Tự động kiểm tra nếu có hàng dữ liệu cũ (lệch cột) cần tái căn chỉnh sang 54 cột
  if (lastRow >= 2) {
    var checkRow = sheet.getRange(2, 1, 1, Math.max(lastCol, 54)).getValues()[0];
    var col25Str = (checkRow[25] !== undefined && checkRow[25] !== null) ? checkRow[25].toString().trim() : "";
    var col26Str = (checkRow[26] !== undefined && checkRow[26] !== null) ? checkRow[26].toString().trim() : "";
    var c11 = (lastCol >= 11) ? sheet.getRange(1, 11).getValue().toString().trim() : "";
    
    // Nếu phát hiện dấu hiệu hàng cũ bị lệch cột hoặc thiếu cột 54:
    if (col25Str.indexOf("{") === 0 || col26Str.indexOf("trai") !== -1 || col26Str.indexOf("chay") !== -1 || c11.indexOf("q1") === 0 || lastCol < 54) {
      upgradeSheetToExplicitHeaders(sheet);
    }
  } else {
    var c11Only = (lastCol >= 11) ? sheet.getRange(1, 11).getValue().toString().trim() : "";
    if (c11Only.indexOf("q1") === 0 || lastCol < 54) {
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
      return createJsonResponse({ success: true, message: "Đã nâng cấp bảng tính lên 54 cột tường minh thành công!" });
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

// 2. XỬ LÝ LƯU HOẶC GHI ĐÈ PHIẾU KHẢO SÁT VÀO GOOGLE SHEET (54 CỘT TƯỜNG MINH)
function handleSubmitSurvey(data, sheet) {
  var targetId = (data.id || "").toString().trim();
  if (!targetId) {
    targetId = "PTV-" + Math.floor(100000 + Math.random() * 900000);
    data.id = targetId;
  }

  // KIỂM TRA TÍNH TOÀN VẸN CỦA ĐIỂM SỐ LIKERT (BẮT BUỘC ĐỦ 18 CÂU VÀ TỪ 1 ĐẾN 5 ĐIỂM)
  var scores = data.scores || {};
  var missingOrInvalid = [];
  for (var k = 0; k < Q_KEYS.length; k++) {
    var qk = Q_KEYS[k];
    var val = parseFloat(scores[qk]);
    if (isNaN(val) || val < 1 || val > 5) {
      missingOrInvalid.push(qk);
    }
  }

  if (missingOrInvalid.length > 0) {
    return createJsonResponse({
      success: false,
      result: "error",
      message: "Phiếu khảo sát chưa hợp lệ: Có " + missingOrInvalid.length + " câu Likert chưa được đánh giá đầy đủ (thang điểm hợp lệ từ 1 đến 5). Vui lòng hoàn thành toàn bộ 18 câu trước khi nộp!"
    });
  }

  // KIỂM TRA BẮT BUỘC NHẬP LÝ DO ĐỐI VỚI CÂU ĐÁNH GIÁ DƯỚI 3 ĐIỂM (ĐIỂM 1 HOẶC 2)
  var reasons = data.reasons || {};
  var missingReasons = [];
  for (var k = 0; k < Q_KEYS.length; k++) {
    var qk = Q_KEYS[k];
    var val = parseFloat(scores[qk]);
    if (val < 3) {
      var rText = (reasons[qk] || "").toString().trim();
      if (!rText) {
        missingReasons.push(qk);
      }
    }
  }

  if (missingReasons.length > 0) {
    return createJsonResponse({
      success: false,
      result: "error",
      message: "Có " + missingReasons.length + " câu đánh giá dưới 3 điểm nhưng chưa có lý do. Trường hợp điểm dưới 3, hệ thống BẮT BUỘC phải nhập lý do đánh giá chưa phù hợp & điểm cần cải thiện trước khi nộp phiếu!"
    });
  }

  // KIỂM TRA BẮT BUỘC CẢ 4 MỤC PHẦN 3: TU HỌC & PHỤNG SỰ (MỤC 19 - 22)
  if (!data.diet || !data.diet.toString().trim()) {
    return createJsonResponse({
      success: false,
      result: "error",
      message: "Vui lòng chọn mục '19. Mức độ thực hành trai kỳ hiện nay' trong Phần 3 trước khi gửi!"
    });
  }
  if (!data.practice || !data.practice.toString().trim()) {
    return createJsonResponse({
      success: false,
      result: "error",
      message: "Vui lòng chọn mục '20. Duy trì thời cúng & công phu hằng ngày' trong Phần 3 trước khi gửi!"
    });
  }
  if (!data.serviceStatus || !data.serviceStatus.toString().trim()) {
    return createJsonResponse({
      success: false,
      result: "error",
      message: "Vui lòng chọn mục '21. Tình trạng tham gia phụng sự tại Họ đạo / GĐHĐ hiện nay' trong Phần 3 trước khi gửi!"
    });
  }
  if (!data.challenge || !data.challenge.toString().trim()) {
    return createJsonResponse({
      success: false,
      result: "error",
      message: "Vui lòng chọn mục '22. Khó khăn / Rào cản lớn nhất gặp phải trong tu học & phụng sự' trong Phần 3 trước khi gửi!"
    });
  }

  // KIỂM TRA BẮT BUỘC CẢ 4 MỤC Ý KIẾN ĐÓNG GÓP TRONG PHẦN 4 (MỤC 23 - 26)
  if (!data.advantages || !data.advantages.toString().trim()) {
    return createJsonResponse({
      success: false,
      result: "error",
      message: "Vui lòng nhập ý kiến cho mục '23. Những mặt LÀM ĐƯỢC' trong Phần 4 trước khi gửi!"
    });
  }
  if (!data.disadvantages || !data.disadvantages.toString().trim()) {
    return createJsonResponse({
      success: false,
      result: "error",
      message: "Vui lòng nhập ý kiến cho mục '24. Những mặt CHƯA LÀM ĐƯỢC' trong Phần 4 trước khi gửi!"
    });
  }
  if (!data.reality || !data.reality.toString().trim()) {
    return createJsonResponse({
      success: false,
      result: "error",
      message: "Vui lòng ghi nhận ý kiến cho mục '25. THỰC TRẠNG của Phổ Tế Viên sau tốt nghiệp' trong Phần 4 trước khi gửi!"
    });
  }
  if (!data.suggestions || !data.suggestions.toString().trim()) {
    return createJsonResponse({
      success: false,
      result: "error",
      message: "Vui lòng nêu ý kiến cho mục '26. ĐỀ XUẤT, KIẾN NGHỊ cải tiến chương trình' trong Phần 4 trước khi gửi!"
    });
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

// 3. ĐỌC TẤT CẢ DỮ LIỆU TỪ GOOGLE SHEET (TỰ ĐỘNG CHUẨN HÓA DỮ LIỆU CHÍNH XÁC 100%)
function readAllResponsesFromSheet(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var lastCol = sheet.getLastColumn();
  var maxCol = Math.max(lastCol, 54);
  var data = sheet.getRange(2, 1, lastRow - 1, maxCol).getValues();
  var responses = [];

  for (var i = 0; i < data.length; i++) {
    var item = parseRowAuto(data[i]);
    if (item && item.id) {
      responses.push(item);
    }
  }
  return responses;
}

// 4. XỬ LÝ XÓA 1 PHIẾU THEO ID TRÊN GOOGLE SHEET (YÊU CẦU MẬT KHẨU QUẢN TRỊ ĐỂ TRÁNH XÓA NHẦM)
function handleDeleteResponse(data, sheet) {
  var pass = (data.password || "").toString().trim();
  if (!pass || ADMIN_CONFIG.passwords.indexOf(pass) === -1) {
    return createJsonResponse({ success: false, message: "Mật khẩu quản trị không chính xác! Thao tác xóa phiếu bị từ chối để bảo vệ dữ liệu." });
  }

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

// 5. XỬ LÝ XÓA TOÀN BỘ DỮ LIỆU TRÊN GOOGLE SHEET (YÊU CẦU MẬT KHẨU QUẢN TRỊ ĐỂ TRÁNH XÓA NHẦM)
function handleClearAll(data, sheet) {
  var pass = (data.password || "").toString().trim();
  if (!pass || ADMIN_CONFIG.passwords.indexOf(pass) === -1) {
    return createJsonResponse({ success: false, message: "Mật khẩu quản trị không chính xác! Thao tác dọn dẹp toàn bộ dữ liệu bị từ chối để bảo vệ hệ thống." });
  }

  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return createJsonResponse({ success: true, message: "Đã dọn dẹp sạch toàn bộ dữ liệu khảo sát trên hệ thống!" });
}
