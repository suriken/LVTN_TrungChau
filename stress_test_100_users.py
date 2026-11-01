# -*- coding: utf-8 -*-
"""
STRESS TEST & CONCURRENCY BENCHMARK CHO HỆ THỐNG KHẢO SÁT PTV TRUNG CHÂU 1
Kịch bản: Tự động tạo 100 Test Cases (TC) dữ liệu thực tế và giả lập 100 người dùng thao tác đồng thời.
"""

import sys
import os
import json
import random
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

# Thiết lập UTF-8 cho console Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# CỔNG BACKEND MỤC TIÊU
TARGET_URL = "https://script.google.com/macros/s/AKfycbwvin6XGotcqOwqyNowHyhW6eF66yLBuT44Q7m5g_ivSl-ObRCLO-GfYJAqsJjkQ0KB1Q/exec"

# DANH SÁCH 18 MÃ CÂU HỎI LIKERT (THEO ĐÚNG 4 TRỤ CỘT ĐÀO TẠO)
Q_KEYS = [
    "q1_levels", "q2_entry", "q3_duration", "q4_method", "q5_motto", "q6_grad",
    "q7_doctrine", "q8_tradition", "q9_skills_guide", "q10_skills_ceremony", "q11_cultivation", "q12_digital_safety",
    "q13_competence", "q14_application", "q15_commitment",
    "q16_psychology", "q17_church_needs", "q18_social_context"
]

# NGUYÊN LIỆU SINH DỮ LIỆU TỰ ĐỘNG THỰC TẾ (VIETNAMESE REALISTIC CORPUS)
FIRST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Huỳnh", "Hoàng", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"]
MID_NAMES = ["Văn", "Thị", "Hữu", "Đức", "Minh", "Thanh", "Ngọc", "Quốc", "Kim", "Anh", "Xuân", "Tấn", "Bảo", "Đình"]
LAST_NAMES = ["Thảo", "Hải", "Tuấn", "Nam", "Dũng", "Châu", "Phương", "Trúc", "Mai", "Cường", "Trí", "Phúc", "Tâm", "Hạnh", "Quân", "Hiếu", "Vinh", "Khoa"]

ROLES = [
    "Chức sắc / Chức việc tại Họ đạo",
    "Huynh trưởng Phổ Tế Viên",
    "Phổ Tế Viên đang sinh hoạt cơ sở",
    "Cựu học viên các khóa PTV",
    "Đoàn sinh Gia Đình Hưng Đạo"
]

UNITS = [
    "Họ đạo Bến Tre (Bến Tre)",
    "Họ đạo Chợ Gạo (Tiền Giang)",
    "Họ đạo Cai Lậy (Tiền Giang)",
    "Họ đạo Vĩnh Long (Vĩnh Long)",
    "Họ đạo Củ Chi (TP. HCM)",
    "Ban Hướng Dẫn Gia Định (TP. HCM)",
    "Họ đạo Tân An (Long An)",
    "Họ đạo Tây Ninh (Tây Ninh)",
    "Họ đạo Long Thành (Đồng Nai)",
    "Họ đạo Cần Thơ (Cần Thơ)"
]

GRAD_LEVELS = [
    "Khóa Dương Đông (Dự bị)",
    "Khóa Gò Kén (Cấp I)",
    "Khóa Cửu Long (Cấp II)",
    "Khóa Trung Châu (Cấp III)"
]

TENURES = [
    "Dưới 1 năm",
    "Từ 1 - 3 năm",
    "Từ 3 - 5 năm",
    "Từ 5 - 10 năm",
    "Trên 10 năm"
]

REGIONS = ["Miền Tây", "TP. Hồ Chí Minh", "Miền Đông", "Miền Trung"]

DIETS = [
    "Thuần chay trường",
    "Ăn chay từ 10 ngày trở lên / tháng",
    "Ăn chay 6 ngày / tháng",
    "Ăn chay 4 ngày / tháng",
    "Đang tập ăn chay theo đàn sóc vọng"
]

PRACTICES = [
    "Duy trì công phu đầy đủ 4 thời (Tý, Ngọ, Mẹo, Dậu)",
    "Duy trì từ 2 - 3 thời cúng mỗi ngày",
    "Duy trì 1 thời cúng chính (thời Tý hoặc Ngọ)",
    "Chỉ tham gia cúng đàn vào ngày mùng 1 và rằm",
    "Chưa duy trì được đều đặn do công việc"
]

SERVICE_STATUS = [
    "Tham gia phụng sự thường xuyên hàng tuần tại Họ đạo",
    "Tham gia vào các ngày sóc vọng, đàn lệ và lễ vía lớn",
    "Thỉnh thoảng tham gia hỗ trợ khi Họ đạo cần người",
    "Tạm ngưng phụng sự do áp lực công việc / học tập"
]

CHALLENGES = [
    "Thời gian bận rộn giữa việc mưu sinh gia đình và việc Đạo",
    "Thiếu tài liệu và học cụ trực quan hỗ trợ giảng dạy đoàn sinh",
    "Khó khăn trong việc thu hút thanh thiếu niên tham gia sinh hoạt",
    "Khoảng cách địa lý từ nhà đến Thánh thất khá xa",
    "Chưa có nhiều sân chơi ứng dụng công nghệ để bạn trẻ hào hứng"
]

REASON_TEMPLATES = [
    "Nội dung còn nặng tính lý thuyết, cần tăng cường giờ thực hành.",
    "Thời lượng các đợt tập trung hơi gấp rút đối với học viên ở xa.",
    "Cần bổ sung thêm tài liệu hướng dẫn kỹ năng mềm và kỹ năng số.",
    "Tiêu chuẩn tuyển sinh cần có sự linh hoạt hơn cho đoàn sinh mới.",
    "Cần cập nhật các phương pháp sinh hoạt phù hợp với tâm lý Gen Z.",
    "Kỹ năng tổ chức lễ nghi cần có thêm clip minh họa thực tế."
]

ADVANTAGES = [
    "Khung chương trình có tính hệ thống cao, rèn luyện được tinh thần kỷ luật và đạo hạnh.",
    "Giúp học viên nắm vững giáo lý căn bản và hiểu sâu về truyền thống lịch sử Đạo.",
    "Tinh thần đoàn kết hàng đội và tình huynh đệ được bồi đắp rất tốt qua các kỳ trại.",
    "Đội ngũ giảng viên nhiệt tâm, truyền đạt kinh nghiệm thực tế sâu sắc."
]

DISADVANTAGES = [
    "Phương pháp giảng dạy đôi lúc còn mang tính một chiều, thiếu tương tác phản biện.",
    "Chưa khai thác mạnh các nền tảng số và mạng xã hội trong đào tạo.",
    "Việc theo dõi và hỗ trợ học viên sau khi tốt nghiệp tại cơ sở còn hạn chế."
]

REALITIES = [
    "Tỷ lệ gắn bó phụng sự tại cơ sở đạt khoảng 60-70%, cần có cơ chế động viên thường xuyên.",
    "Nhiều bạn trẻ nhiệt huyết nhưng sau khi ra trường đi làm xa khó duy trì liên tục.",
    "Lực lượng PTV trẻ rất năng động, là nòng cốt kế thừa quan trọng cho Họ đạo."
]

SUGGESTIONS = [
    "Đề xuất xây dựng ngân hàng bài giảng số và video clip hướng dẫn kỹ năng.",
    "Nên tổ chức các buổi hội thảo chuyên đề định kỳ sau tốt nghiệp để cập nhật kiến thức.",
    "Bổ sung chuyên đề về kỹ năng sơ cấp cứu y tế và kỹ năng sinh hoạt dã ngoại an toàn.",
    "Cần tăng cường liên kết giữa các Họ đạo để học viên có cơ hội giao lưu, học hỏi."
]

def generate_test_case(index):
    """Tạo ra 1 Test Case đầy đủ, hợp lệ và thực tế"""
    full_name = f"{random.choice(FIRST_NAMES)} {random.choice(MID_NAMES)} {random.choice(LAST_NAMES)}"
    phone = f"09{random.randint(10000000, 99999999)}"
    ptv_id = f"PTV-STRESS-{index:03d}-{random.randint(1000, 9999)}"
    
    # 18 điểm Likert (ngẫu nhiên từ 1 đến 5, phân bổ tự nhiên)
    scores = {}
    reasons = {}
    total_score = 0
    
    for q in Q_KEYS:
        # Tỷ lệ: 75% cho 3-5 điểm, 25% cho 1-2 điểm để kiểm tra logic nhập lý do
        val = random.choices([1, 2, 3, 4, 5], weights=[5, 10, 20, 40, 25])[0]
        scores[q] = val
        total_score += val
        
        # Nếu điểm < 3 thì tự động sinh lý do giải thích
        if val < 3:
            reasons[q] = random.choice(REASON_TEMPLATES)
            
    avg_score = round(total_score / len(Q_KEYS), 2)
    
    tc = {
        "tc_id": f"TC-{index:03d}",
        "action": "submit",
        "id": ptv_id,
        "name": full_name,
        "phone": phone,
        "role": random.choice(ROLES),
        "unit": random.choice(UNITS),
        "gradLevel": random.choice(GRAD_LEVELS),
        "tenure": random.choice(TENURES),
        "region": random.choice(REGIONS),
        "avgScore": avg_score,
        "scores": scores,
        "reasons": reasons,
        "diet": random.choice(DIETS),
        "practice": random.choice(PRACTICES),
        "serviceStatus": random.choice(SERVICE_STATUS),
        "challenge": random.choice(CHALLENGES),
        "advantages": random.choice(ADVANTAGES),
        "disadvantages": random.choice(DISADVANTAGES),
        "reality": random.choice(REALITIES),
        "suggestions": random.choice(SUGGESTIONS),
        "timestamp": time.strftime("%d/%m/%Y %H:%M:%S")
    }
    return tc

def send_survey_request(tc):
    """Thực hiện gửi 1 phiếu khảo sát đến Backend và đo lường thời gian phản hồi"""
    start_time = time.time()
    result = {
        "tc_id": tc["tc_id"],
        "id": tc["id"],
        "name": tc["name"],
        "avgScore": tc["avgScore"],
        "success": False,
        "status_code": 0,
        "duration": 0.0,
        "message": ""
    }
    
    payload_bytes = json.dumps(tc, ensure_ascii=False).encode('utf-8')
    headers = {
        "Content-Type": "application/json;charset=utf-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) StressTestRunner/2.0"
    }
    
    req = urllib.request.Request(TARGET_URL, data=payload_bytes, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result["status_code"] = resp.status
            body = resp.read().decode('utf-8', errors='replace')
            result["duration"] = round(time.time() - start_time, 3)
            
            try:
                data = json.loads(body)
                if data.get("success") is True or data.get("result") == "success":
                    result["success"] = True
                    result["message"] = data.get("message", "Lưu thành công!")
                else:
                    result["message"] = data.get("message") or data.get("error") or "Lỗi nghiệp vụ"
            except Exception:
                result["message"] = body[:100]
                
    except urllib.error.HTTPError as e:
        result["duration"] = round(time.time() - start_time, 3)
        result["status_code"] = e.code
        result["message"] = f"HTTP {e.code}: {e.reason}"
    except Exception as ex:
        result["duration"] = round(time.time() - start_time, 3)
        result["message"] = str(ex)
        
    return result

def run_stress_test(num_users=100, max_concurrency=100):
    print("=" * 70)
    print(f"🚀 BẮT ĐẦU STRESS TEST HỆ THỐNG: {num_users} TEST CASES (CONCURRENCY: {max_concurrency})")
    print(f"🎯 Mục tiêu: {TARGET_URL}")
    print("=" * 70)
    
    # 1. Sinh 100 Test Cases
    print(f"\n[1/3] Đang tự động sinh dữ liệu {num_users} Test Cases...")
    test_cases = [generate_test_case(i + 1) for i in range(num_users)]
    
    # Lưu danh sách 100 TC ra file để lưu trữ
    tc_file = "test_cases_100.json"
    with open(tc_file, "w", encoding="utf-8") as f:
        json.dump(test_cases, f, ensure_ascii=False, indent=2)
    print(f"✅ Đã tạo và lưu {len(test_cases)} Test Cases vào file: '{tc_file}'")
    
    # 2. Bắn 100 requests đồng thời (Concurrent Threads)
    print(f"\n[2/3] Đang khởi động {max_concurrency} luồng đồng thời giả lập {num_users} người dùng cùng thao tác...")
    bench_start = time.time()
    results = []
    
    with ThreadPoolExecutor(max_workers=max_concurrency) as executor:
        future_map = {executor.submit(send_survey_request, tc): tc for tc in test_cases}
        
        completed_count = 0
        for future in as_completed(future_map):
            completed_count += 1
            res = future.result()
            results.append(res)
            
            icon = "✅" if res["success"] else "❌"
            print(f"[{completed_count:03d}/{num_users:03d}] {icon} {res['tc_id']} ({res['name']}): "
                  f"Điểm TB={res['avgScore']} | HTTP {res['status_code']} | "
                  f"Thời gian: {res['duration']}s | {res['message'][:50]}")
                  
    total_elapsed = round(time.time() - bench_start, 2)
    
    # 3. Phân tích kết quả & Thống kê hiệu năng
    success_count = sum(1 for r in results if r["success"])
    fail_count = num_users - success_count
    durations = [r["duration"] for r in results if r["duration"] > 0]
    
    avg_dur = round(sum(durations) / len(durations), 3) if durations else 0
    min_dur = min(durations) if durations else 0
    max_dur = max(durations) if durations else 0
    rps = round(num_users / total_elapsed, 2) if total_elapsed > 0 else 0
    
    print("\n" + "=" * 70)
    print("📊 BÁO CÁO KẾT QUẢ STRESS TEST (100 CONCURRENT USERS):")
    print("=" * 70)
    print(f"• Tổng số yêu cầu (Total Requests):  {num_users}")
    print(f"• Số yêu cầu thành công (Success):    {success_count} ({round(success_count / num_users * 100, 1)}%)")
    print(f"• Số yêu cầu thất bại (Failed):      {fail_count}")
    print(f"• Tổng thời gian kiểm thử (Elapsed): {total_elapsed} giây")
    print(f"• Tốc độ xử lý (Throughput):         {rps} yêu cầu/giây (req/s)")
    print(f"• Thời gian phản hồi nhanh nhất:     {min_dur}s")
    print(f"• Thời gian phản hồi chậm nhất:      {max_dur}s")
    print(f"• Thời gian phản hồi trung bình:     {avg_dur}s")
    print("=" * 70)
    
    # Lưu file báo cáo chi tiết
    report_file = "stress_test_report.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump({
            "total_requests": num_users,
            "success": success_count,
            "failed": fail_count,
            "total_elapsed_seconds": total_elapsed,
            "throughput_rps": rps,
            "min_duration": min_dur,
            "max_duration": max_dur,
            "avg_duration": avg_dur,
            "detailed_results": results
        }, f, ensure_ascii=False, indent=2)
    print(f"📁 Báo cáo chi tiết đã được lưu tại: '{report_file}'\n")

if __name__ == "__main__":
    run_stress_test(num_users=100, max_concurrency=100)

