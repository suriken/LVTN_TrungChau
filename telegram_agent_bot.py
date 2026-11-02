#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
TELEGRAM AGENT BOT - ĐIỀU KHIỂN & DEPLOY DỰ ÁN LVTN_TRUNGCHAU TỪ IPHONE (iOS)
================================================================================
Tác giả: Dự án Luận Văn Tốt Nghiệp Phổ Tế Viên Cấp III Trung Châu 1
Chức năng:
  - Nhận prompt từ Telegram trên điện thoại iOS / Android
  - Tự động gọi Google Gemini 2.5 để đọc code, chỉnh sửa, kiểm tra cú pháp
  - Tự động Git commit & Git push lên origin/main
  - Kích hoạt GitHub Actions tự động Clasp Deploy lên Google Apps Script
  - Phản hồi báo cáo tiến độ chi tiết về Telegram
================================================================================
"""

import os
import sys

# Đảm bảo in tiếng Việt & emoji UTF-8 an toàn trên Windows CMD
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import json
import time
import subprocess
import traceback
import requests
import urllib3
from pathlib import Path

# Vô hiệu hóa cảnh báo SSL khi chạy trong mạng doanh nghiệp / proxy
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Thư mục gốc của repository
REPO_DIR = Path(__file__).resolve().parent
CONFIG_FILE = REPO_DIR / "telegram_config.json"
EXAMPLE_CONFIG_FILE = REPO_DIR / "telegram_config.example.json"

def load_config():
    """Tải cấu hình từ telegram_config.json hoặc biến môi trường"""
    config = {
        "telegram_bot_token": os.environ.get("TELEGRAM_BOT_TOKEN", ""),
        "telegram_chat_id": os.environ.get("TELEGRAM_CHAT_ID", ""),
        "gemini_api_key": os.environ.get("GEMINI_API_KEY", ""),
        "gemini_model": os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
    }

    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                config.update(saved)
        except Exception as e:
            print(f"[!] Lỗi đọc file config: {e}")

    return config

def save_config(config):
    """Lưu cấu hình vào file telegram_config.json"""
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

class TelegramBot:
    def __init__(self, token, allowed_chat_id):
        self.token = token
        self.allowed_chat_id = str(allowed_chat_id).strip()
        self.base_url = f"https://api.telegram.org/bot{token}"
        self.last_update_id = 0

    def send_message(self, chat_id, text, parse_mode=None):
        """Gửi tin nhắn Telegram (chia nhỏ nếu quá dài)"""
        url = f"{self.base_url}/sendMessage"
        max_len = 4000
        chunks = [text[i:i + max_len] for i in range(0, len(text), max_len)]
        
        for chunk in chunks:
            payload = {
                "chat_id": chat_id,
                "text": chunk
            }
            if parse_mode:
                payload["parse_mode"] = parse_mode
            try:
                requests.post(url, json=payload, verify=False, timeout=15)
            except Exception as e:
                print(f"[!] Lỗi gửi tin nhắn Telegram: {e}")

    def send_initial_console(self, chat_id, text):
        """Gửi khung tin nhắn Live Console ban đầu để chuẩn bị edit thời gian thực"""
        url = f"{self.base_url}/sendMessage"
        payload = {"chat_id": chat_id, "text": text}
        try:
            r = requests.post(url, json=payload, verify=False, timeout=15)
            if r.ok:
                return r.json().get("result", {}).get("message_id")
        except Exception as e:
            print(f"[!] Lỗi gửi Live Console ban đầu: {e}")
        return None

    def update_console(self, chat_id, message_id, text):
        """Cập nhật nội dung Live Console trên Telegram theo thời gian thực (editMessageText)"""
        if not message_id:
            return
        url = f"{self.base_url}/editMessageText"
        payload = {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text
        }
        try:
            requests.post(url, json=payload, verify=False, timeout=15)
        except Exception as e:
            # Bỏ qua lỗi nếu tin nhắn không đổi hoặc lỗi rate-limit nhỏ
            pass

    def get_updates(self):
        """Lấy tin nhắn mới theo cơ chế long-polling"""
        url = f"{self.base_url}/getUpdates"
        params = {"timeout": 30, "offset": self.last_update_id + 1}
        try:
            resp = requests.get(url, params=params, verify=False, timeout=35)
            if resp.ok:
                data = resp.json()
                if data.get("ok"):
                    return data.get("result", [])
        except requests.exceptions.Timeout:
            pass
        except Exception as e:
            print(f"[!] Lỗi polling Telegram: {e}")
            time.sleep(3)
        return []

# ==============================================================================
# HỆ THỐNG LIVE CONSOLE TƯỜNG MINH THỜI GIAN THỰC (VS CODE & TELEGRAM STREAM)
# ==============================================================================

from datetime import datetime

class LiveConsole:
    def __init__(self, bot, chat_id, prompt):
        self.bot = bot
        self.chat_id = chat_id
        self.prompt = prompt
        self.start_time = datetime.now()
        self.steps = []
        self.model_name = "Đang khởi tạo..."
        self.last_update_time = 0
        
        # 1. Gửi tin nhắn Live Console ban đầu lên Telegram
        initial_text = (
            f"🖥️ [LIVE CONSOLE - THỜI GIAN THỰC]\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📌 Yêu cầu: \"{self.prompt}\"\n"
            f"⏳ Trạng thái: 🧠 Đang khởi tạo kết nối Gemini AI...\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"(Màn hình này sẽ tự động cập nhật từng bước)"
        )
        self.message_id = self.bot.send_initial_console(self.chat_id, initial_text)
        self._append_history_start()

    def set_model(self, model_name):
        self.model_name = model_name
        self.refresh(force=True)

    def log_action(self, action_text):
        ts = datetime.now().strftime("%H:%M:%S")
        self.steps.append(f"[{ts}] {action_text}")
        print(f"[LIVE] {action_text}")
        self.refresh()

    def refresh(self, force=False):
        now = time.time()
        # Giới hạn tối thiểu 0.8s mỗi lần edit để tránh Telegram 429 rate limit
        if not force and (now - self.last_update_time < 0.8):
            return
        self.last_update_time = now

        recent_steps = self.steps[-6:] if self.steps else ["Đang chuẩn bị phân tích mã nguồn..."]
        steps_display = "\n".join([f"• {s}" for s in recent_steps])
        
        console_text = (
            f"🖥️ [LIVE CONSOLE - ĐANG XỬ LÝ]\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📌 Yêu cầu: \"{self.prompt}\"\n"
            f"🤖 Mô hình: {self.model_name}\n"
            f"⏱️ Bắt đầu: {self.start_time.strftime('%H:%M:%S')}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"⚡ TIẾN TRÌNH THỰC THI:\n"
            f"{steps_display}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🔄 Đang trực tiếp sửa đổi & kiểm thử..."
        )
        self.bot.update_console(self.chat_id, self.message_id, console_text)

    def finish(self, final_report, deploy_report):
        duration = (datetime.now() - self.start_time).total_seconds()
        final_console_text = (
            f"🖥️ [LIVE CONSOLE - HOÀN TẤT]\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📌 Yêu cầu: \"{self.prompt}\"\n"
            f"🤖 Mô hình: {self.model_name} (Xong trong {duration:.1f}s)\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"✅ KẾT QUẢ THỰC HIỆN:\n"
            f"{final_report}\n\n"
            f"────────────────────────────\n"
            f"{deploy_report}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📜 Đã ghi nhật ký vào LIVE_PROMPT_HISTORY.md trên VS Code"
        )
        self.bot.update_console(self.chat_id, self.message_id, final_console_text)
        self._append_history_done(final_report, deploy_report, duration)

    def _append_history_start(self):
        try:
            entry = (
                f"\n### ⏱️ [{self.start_time.strftime('%d/%m/%Y %H:%M:%S')}] Prompt: \"{self.prompt}\"\n"
                f"- **Mô hình:** Đang phân tích...\n"
                f"- **Trạng thái:** ⏳ Đang xử lý trực tiếp trong Live Console...\n"
            )
            with open(REPO_DIR / "LIVE_PROMPT_HISTORY.md", "a", encoding="utf-8") as f:
                f.write(entry)
        except Exception as e:
            print(f"[!] Lỗi ghi file LIVE_PROMPT_HISTORY.md: {e}")

    def _append_history_done(self, final_report, deploy_report, duration):
        try:
            steps_md = "\n".join([f"  - {s}" for s in self.steps])
            entry = (
                f"- **Thời gian xử lý:** {duration:.1f} giây\n"
                f"- **Mô hình hoàn thành:** `{self.model_name}`\n"
                f"- **Nhật ký tiến trình thực thi:**\n{steps_md}\n\n"
                f"- **Báo cáo kết quả:**\n```\n{final_report}\n```\n\n"
                f"- **Triển khai máy chủ:**\n```\n{deploy_report}\n```\n"
                f"---\n"
            )
            with open(REPO_DIR / "LIVE_PROMPT_HISTORY.md", "a", encoding="utf-8") as f:
                f.write(entry)
        except Exception as e:
            print(f"[!] Lỗi ghi file LIVE_PROMPT_HISTORY.md: {e}")

# Biến toàn cục theo dõi phiên Live Console hiện hành
ACTIVE_CONSOLE = None

# ==============================================================================
# CÁC CÔNG CỤ (TOOLS) CHO AGENT GEMINI
# ==============================================================================

def tool_list_files(subpath: str = "") -> str:
    """Liệt kê các tệp và thư mục trong dự án."""
    if ACTIVE_CONSOLE:
        ACTIVE_CONSOLE.log_action(f"📁 Duyệt thư mục: `{subpath or '.'}`")
    try:
        target = REPO_DIR / subpath.strip("/")
        if not target.exists():
            return f"Lỗi: Thư mục {subpath} không tồn tại!"
        items = []
        for item in target.iterdir():
            if item.name.startswith(".") and item.name not in [".github", ".clasp.json"]:
                continue
            if item.name in ["__pycache__", "node_modules"]:
                continue
            item_type = "📁" if item.is_dir() else "📄"
            items.append(f"{item_type} {item.name}")
        return "\n".join(items) if items else "(Thư mục trống)"
    except Exception as e:
        return f"Lỗi khi liệt kê file: {e}"

def tool_read_file(file_path: str, start_line: int = 1, end_line: int = 500) -> str:
    """Đọc nội dung một tệp theo phạm vi dòng."""
    if ACTIVE_CONSOLE:
        ACTIVE_CONSOLE.log_action(f"📖 Đọc tệp: `{file_path}` (dòng {start_line} - {end_line})")
    try:
        path = REPO_DIR / file_path.strip("/")
        if not path.is_file():
            return f"Lỗi: Không tìm thấy tệp {file_path}"
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
        total = len(lines)
        s = max(1, start_line)
        e = min(total, end_line)
        selected = lines[s - 1:e]
        result = [f"{i}: {line}" for i, line in zip(range(s, e + 1), selected)]
        return f"--- File: {file_path} (Dòng {s} đến {e} / Tổng {total} dòng) ---\n" + "".join(result)
    except Exception as e:
        return f"Lỗi đọc file: {e}"

def tool_edit_file(file_path: str, target: str, replacement: str) -> str:
    """Thay thế chính xác một đoạn văn bản trong tệp."""
    if ACTIVE_CONSOLE:
        ACTIVE_CONSOLE.log_action(f"✏️ Đang sửa đổi nội dung: `{file_path}`")
    try:
        path = REPO_DIR / file_path.strip("/")
        if not path.is_file():
            return f"Lỗi: Không tìm thấy tệp {file_path}"
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        if target not in content:
            return f"Lỗi: Không tìm thấy đoạn văn bản 'target' trong tệp {file_path}. Vui lòng đọc lại tệp để lấy chính xác từng ký tự và khoảng trắng."
        new_content = content.replace(target, replacement, 1)
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
        return f"Thành công: Đã sửa tệp {file_path}."
    except Exception as e:
        return f"Lỗi sửa file: {e}"

def tool_write_full_file(file_path: str, content: str) -> str:
    """Tạo mới hoặc ghi đè toàn bộ nội dung một tệp."""
    if ACTIVE_CONSOLE:
        ACTIVE_CONSOLE.log_action(f"📝 Đang ghi tệp: `{file_path}` ({len(content)} ký tự)")
    try:
        path = REPO_DIR / file_path.strip("/")
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return f"Thành công: Đã ghi tệp {file_path} ({len(content)} ký tự)."
    except Exception as e:
        return f"Lỗi ghi file: {e}"

def tool_run_terminal(command: str) -> str:
    """Chạy lệnh dòng lệnh kiểm thử (ví dụ: git status, node -c...)."""
    if ACTIVE_CONSOLE:
        ACTIVE_CONSOLE.log_action(f"⚡ Chạy kiểm thử: `{command[:65]}`")
    try:
        # Ngăn chặn các lệnh nguy hiểm
        blocked = ["rmdir /s /q c:", "format", "del /f /s /q *", "drop database"]
        for b in blocked:
            if b in command.lower():
                return f"Lỗi: Lệnh bị từ chối vì lý do an toàn!"
        
        res = subprocess.run(
            command, cwd=REPO_DIR, shell=True, capture_output=True,
            text=True, encoding="utf-8", errors="replace", timeout=30
        )
        output = res.stdout
        if res.stderr:
            output += "\nSTDERR:\n" + res.stderr
        return output.strip() if output.strip() else "(Lệnh đã chạy xong, không có output)"
    except subprocess.TimeoutExpired:
        return "Lỗi: Lệnh chạy quá thời gian 30 giây."
    except Exception as e:
        return f"Lỗi thực thi lệnh: {e}"

# ==============================================================================
# AGENT XỬ LÝ PROMPT VỚI GOOGLE GEMINI (HỖ TRỢ AUTO-RETRY & AUTO-FALLBACK)
# ==============================================================================

def execute_mobile_prompt(prompt: str, gemini_api_key: str, model_name: str = "gemini-3.8-flash", status_callback=None) -> str:
    """Sử dụng Google Gemini với Function Calling, tự động thử lại khi 503 hoặc chuyển model dự phòng"""
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        return "Lỗi: Chưa cài đặt thư viện `google-genai`. Vui lòng chạy `pip install google-genai`."

    client = genai.Client(
        api_key=gemini_api_key,
        http_options=types.HttpOptions(client_args={"verify": False})
    )

    tools = [
        tool_list_files,
        tool_read_file,
        tool_edit_file,
        tool_write_full_file,
        tool_run_terminal
    ]

    system_instruction = """
Bạn là AI Developer tự hành phụ trách bảo trì và nâng cấp dự án LVTN_TrungChau (Google Apps Script + Single-page HTML).
Mã nguồn chính bao gồm:
- `index.html`: Giao diện khảo sát đơn lẻ toàn diện (HTML + Tailwind CSS + JS vanilla), bao gồm 4 Trụ Cột, 26 mục bắt buộc, Dashboard phân tích.
- `Code.gs`: Backend Google Apps Script lưu trữ trên Google Sheets (54 cột), xử lý xác thực admin, CRUD và tính điểm.

Nhiệm vụ của bạn khi nhận yêu cầu từ người dùng qua điện thoại di động:
1. Đọc kỹ yêu cầu và dùng tool_read_file để xem đoạn code liên quan trong index.html hoặc Code.gs.
2. Dùng tool_edit_file hoặc tool_write_full_file để thực hiện thay đổi một cách cẩn trọng, chính xác.
3. Luôn giữ nguyên các bình luận, phong cách thiết kế và cấu trúc giao diện đã có.
4. Sau khi sửa, dùng tool_run_terminal chạy kiểm tra cú pháp JS/Node:
   `node -e "const fs = require('fs'); const code = fs.readFileSync('Code.gs', 'utf8'); new Function(code); console.log('Code.gs OK');"`
   hoặc kiểm tra script trong index.html.
5. Sau khi hoàn tất và chắc chắn không có lỗi cú pháp, trả về bản báo cáo tóm tắt bằng tiếng Việt ngắn gọn:
   - Các file đã chỉnh sửa
   - Tóm tắt những thay đổi chính
   - Đảm bảo tính sẵn sàng để deploy
"""

    # Danh sách model ưu tiên (mô hình người dùng chọn đứng đầu, sau đó là các bản dự phòng)
    models_to_try = [model_name]
    for alt in [
        "gemini-3.8-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-3.5-flash",
        "gemini-flash-latest"
    ]:
        if alt not in models_to_try:
            models_to_try.append(alt)

    last_error_msg = ""
    for target_model in models_to_try:
        if status_callback:
            status_callback(f"🧠 Đang gọi mô hình `{target_model}` để phân tích yêu cầu...")

        for attempt in range(1, 3):
            try:
                chat = client.chats.create(
                    model=target_model,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.2,
                        tools=tools
                    )
                )

                resp = chat.send_message(f"Yêu cầu từ người quản trị qua iPhone: {prompt}")
                final_text = resp.text or "Đã thực hiện xong các chỉnh sửa theo yêu cầu."
                return f"*(Mô hình: `{target_model}`)*\n\n{final_text}"
            except Exception as e:
                err_str = str(e)
                last_error_msg = err_str
                print(f"[!] Thử lần {attempt} với `{target_model}` thất bại: {err_str}")

                # Quá tải tạm thời (503) -> thử lại
                if "503" in err_str or "UNAVAILABLE" in err_str or "high demand" in err_str.lower():
                    if status_callback and attempt < 2:
                        status_callback(f"⏳ `{target_model}` đang có lượng truy cập cao (503). Đang tự động thử lại...")
                    time.sleep(3)
                    continue
                # Hết hạn ngạch (429) -> chuyển ngay sang model kế tiếp
                elif "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                    if status_callback:
                        status_callback(f"⚠️ `{target_model}` đạt giới hạn lượt gọi ngày (429). Đang tự động chuyển sang mô hình Flash-Lite dự phòng...")
                    break
                else:
                    break

    return f"❌ Không thể hoàn thành yêu cầu qua các mô hình AI. Chi tiết lỗi cuối cùng: {last_error_msg}"

# ==============================================================================
# HÀM TỰ ĐỘNG GIT COMMIT, PUSH & TRIGGER DEPLOY
# ==============================================================================

def check_and_deploy_changes(prompt_summary: str) -> str:
    """Kiểm tra thay đổi git, commit và push lên origin main"""
    try:
        # 1. Kiểm tra git status
        status_res = subprocess.run(["git", "status", "--porcelain"], cwd=REPO_DIR, capture_output=True, text=True, encoding="utf-8", errors="replace")
        changes = status_res.stdout.strip()
        
        if not changes:
            if ACTIVE_CONSOLE:
                ACTIVE_CONSOLE.log_action("ℹ️ Không có file nào thay đổi.")
            return "ℹ️ Không có file nào thay đổi sau khi xử lý yêu cầu."

        # 2. Chạy kiểm tra cú pháp nhanh
        if ACTIVE_CONSOLE:
            ACTIVE_CONSOLE.log_action("🔍 Kiểm tra cú pháp JavaScript & Apps Script...")
        try:
            subprocess.run([
                "node", "-e",
                "const fs = require('fs'); const html = fs.readFileSync('index.html', 'utf8'); const scripts = html.match(/<script[\\s\\S]*?<\\/script>/gi) || []; scripts.forEach(s => new Function(s.replace(/<script[^>]*>|<\\/script>/gi, ''))); console.log('Syntax OK');"
            ], cwd=REPO_DIR, check=True, capture_output=True, encoding="utf-8", errors="replace")
            if ACTIVE_CONSOLE:
                ACTIVE_CONSOLE.log_action("✅ Kiểm tra cú pháp hoàn tất: 0 lỗi!")
        except Exception as e:
            if ACTIVE_CONSOLE:
                ACTIVE_CONSOLE.log_action(f"❌ Cú pháp có lỗi: {e}")
            return f"⚠️ Cảnh báo cú pháp JavaScript trong index.html có lỗi! Hủy thao tác đẩy code lên máy chủ để tránh hỏng hệ thống.\nChi tiết: {e}"

        # 3. Git add
        subprocess.run(["git", "add", "-A"], cwd=REPO_DIR, check=True)

        # 4. Git commit
        commit_msg = f"feat(mobile): {prompt_summary[:80]}"
        if ACTIVE_CONSOLE:
            ACTIVE_CONSOLE.log_action(f"📦 Đang tạo commit: `{commit_msg}`")
        subprocess.run(["git", "commit", "-m", commit_msg], cwd=REPO_DIR, check=True)

        # 5. Git push
        if ACTIVE_CONSOLE:
            ACTIVE_CONSOLE.log_action("🚀 Đang Git push lên GitHub origin/main...")
        push_res = subprocess.run(["git", "push", "origin", "main"], cwd=REPO_DIR, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if push_res.returncode != 0:
            if ACTIVE_CONSOLE:
                ACTIVE_CONSOLE.log_action("❌ Git push thất bại!")
            return f"❌ Lỗi khi git push lên GitHub:\n{push_res.stderr}"

        # Lấy commit hash vừa push
        rev_res = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=REPO_DIR, capture_output=True, text=True, encoding="utf-8", errors="replace")
        commit_hash = rev_res.stdout.strip()
        if ACTIVE_CONSOLE:
            ACTIVE_CONSOLE.log_action(f"✅ Đã push commit `{commit_hash}`! GitHub Actions đang deploy...")

        return (
            f"🚀 **ĐÃ ĐẨY CODE LÊN GITHUB THÀNH CÔNG!**\n"
            f"• Commit: `{commit_hash}`\n"
            f"• Thông điệp: `{commit_msg}`\n"
            f"• GitHub Actions: Đang tự động build & deploy lên Google Apps Script!\n"
            f"• Theo dõi tại: https://github.com/suriken/LVTN_TrungChau/actions"
        )
    except Exception as e:
        return f"Lỗi trong quá trình commit/deploy: {e}"

# ==============================================================================
# VÒNG LẶP CHÍNH CỦA TELEGRAM BOT
# ==============================================================================

def run_bot():
    print("=" * 65)
    print("🤖 KHỞI ĐỘNG ANTIGRAVITY MOBILE TELEGRAM BOT")
    print("=" * 65)

    config = load_config()
    token = config.get("telegram_bot_token")
    allowed_chat_id = str(config.get("telegram_chat_id", "")).strip()
    gemini_key = config.get("gemini_api_key", "").strip()

    if not token or "Dien_Bot_Token" in token:
        print("\n[!] CHƯA CẤU HÌNH BOT TELEGRAM!")
        print(f"👉 Vui lòng mở file: {CONFIG_FILE}")
        print("   và điền 'telegram_bot_token', 'telegram_chat_id', 'gemini_api_key'.")
        print("   Xem file hướng dẫn tại: telegram_config.example.json\n")
        return

    bot = TelegramBot(token, allowed_chat_id)

    # Thử gọi getMe để xác minh Token
    try:
        me_resp = requests.get(f"{bot.base_url}/getMe", verify=False, timeout=15).json()
        if not me_resp.get("ok"):
            print(f"[❌] Bot Token không hợp lệ: {me_resp}")
            return
        bot_username = me_resp["result"]["username"]
        print(f"✅ Đã kết nối thành công với Bot: @{bot_username}")
    except Exception as e:
        print(f"[❌] Không thể kết nối tới máy chủ Telegram: {e}")
        return

    # Thông báo khởi động nếu có chat_id
    if allowed_chat_id and allowed_chat_id != "Dien_Chat_ID_Cua_Ban_Vao_Day":
        print(f"🔒 Chế độ bảo mật: Chỉ nhận lệnh từ Chat ID: {allowed_chat_id}")
        bot.send_message(
            allowed_chat_id,
            "🟢 **Antigravity Mobile Bot Đã Sẵn Sàng!**\n"
            "Máy tính ở nhà đang bật và kết nối repository `LVTN_TrungChau`.\n"
            "Quý Huynh/Tỷ có thể gửi prompt yêu cầu trực tiếp từ đây bất kỳ lúc nào!"
        )
    else:
        print("⚠️ Chưa cấu hình 'telegram_chat_id'. Hãy gửi tin nhắn /start từ iPhone đến Bot để nhận Chat ID!")

    print("\n⏳ Đang lắng nghe tin nhắn từ iPhone... (Bấm Ctrl+C trên máy tính để dừng)\n")

    while True:
        try:
            updates = bot.get_updates()
            for update in updates:
                bot.last_update_id = update["update_id"]
                message = update.get("message")
                if not message:
                    continue

                chat_id = str(message["chat"]["id"])
                user_name = message["from"].get("first_name", "User")
                text = (message.get("text") or message.get("caption") or "").strip()

                # Nếu người dùng gửi ảnh không kèm chữ hoặc caption
                if not text and message.get("photo"):
                    bot.send_message(
                        chat_id,
                        "📸 Đã nhận ảnh từ Quý Huynh/Tỷ!\n"
                        "Quý vị vui lòng gửi kèm tin nhắn văn bản mô tả yêu cầu cần sửa đổi nhé."
                    )
                    continue

                if not text:
                    continue

                print(f"[📩] Nhận tin nhắn từ {user_name} ({chat_id}): {text}")

                # Nếu chưa cấu hình allowed_chat_id, hướng dẫn người dùng
                if not allowed_chat_id or allowed_chat_id == "Dien_Chat_ID_Cua_Ban_Vao_Day":
                    config["telegram_chat_id"] = chat_id
                    save_config(config)
                    allowed_chat_id = chat_id
                    bot.allowed_chat_id = chat_id
                    reply = (
                        f"👋 Xin chào {user_name}!\n"
                        f"Đã ghi nhận Chat ID của bạn: `{chat_id}`.\n"
                        f"Từ bây giờ chỉ có tài khoản này mới có quyền gửi lệnh và sửa code!"
                    )
                    bot.send_message(chat_id, reply)
                    continue

                # Kiểm tra quyền truy cập (bảo mật tuyệt đối)
                if chat_id != allowed_chat_id:
                    print(f"[⛔] Từ chối truy cập từ người lạ: {chat_id}")
                    bot.send_message(chat_id, "⛔ Bạn không có quyền điều khiển hệ thống này!")
                    continue

                # XỬ LÝ CÁC LỆNH HỆ THỐNG
                if text == "/start" or text == "/help":
                    help_msg = (
                        "👋 **HƯỚNG DẪN ĐIỀU KHIỂN TỪ XA:**\n\n"
                        "📲 **Ra lệnh bằng Prompt:**\n"
                        "Chỉ cần gõ bất kỳ yêu cầu nào, ví dụ:\n"
                        "• *Đổi màu tiêu đề thành xanh đậm*\n"
                        "• *Thêm nút xuất file PDF*\n"
                        "• *Sửa lỗi chính tả trong câu 16*\n\n"
                        "⚙️ **Các lệnh nhanh:**\n"
                        "• `/status` : Xem trạng thái Git & file đang thay đổi\n"
                        "• `/deploy` : Đẩy git push & deploy ngay lên Google Apps Script\n"
                        "• `/log` : Xem 5 commit gần nhất\n"
                        "• `/help` : Xem lại trợ giúp này"
                    )
                    bot.send_message(chat_id, help_msg)
                    continue

                elif text == "/status":
                    res = subprocess.run(["git", "status", "--short"], cwd=REPO_DIR, capture_output=True, text=True, encoding="utf-8", errors="replace")
                    rev = subprocess.run(["git", "log", "-1", "--oneline"], cwd=REPO_DIR, capture_output=True, text=True, encoding="utf-8", errors="replace")
                    st_text = res.stdout.strip() or "(Không có file nào bị sửa đổi)"
                    reply = f"📊 **TRẠNG THÁI HỆ THỐNG:**\n• Commit gần nhất: `{rev.stdout.strip()}`\n• Thay đổi chưa commit:\n```\n{st_text}\n```"
                    bot.send_message(chat_id, reply)
                    continue

                elif text == "/log":
                    rev = subprocess.run(["git", "log", "-5", "--oneline"], cwd=REPO_DIR, capture_output=True, text=True, encoding="utf-8", errors="replace")
                    bot.send_message(chat_id, f"📜 **5 COMMIT GẦN NHẤT:**\n```\n{rev.stdout.strip()}\n```")
                    continue

                elif text == "/deploy":
                    bot.send_message(chat_id, "🚀 Đang thực hiện git push lên GitHub để kích hoạt Deploy...")
                    deploy_result = check_and_deploy_changes("Manual deploy from iOS")
                    bot.send_message(chat_id, deploy_result)
                    continue

                # XỬ LÝ PROMPT TỰ HÀNH BẰNG GEMINI AI
                if not gemini_key or "Dien_Gemini" in gemini_key:
                    bot.send_message(
                        chat_id,
                        "⚠️ Chưa cấu hình `gemini_api_key` trong file `telegram_config.json`.\n"
                        "Vui lòng lấy API key miễn phí tại: https://aistudio.google.com/app/api-keys rồi dán vào file cấu hình trên máy tính."
                    )
                    continue

                selected_model = config.get("gemini_model", "gemini-3.8-flash")

                # KHỞI TẠO PHIÊN LIVE CONSOLE THỜI GIAN THỰC
                global ACTIVE_CONSOLE
                ACTIVE_CONSOLE = LiveConsole(bot, chat_id, text)

                def update_cb(msg):
                    if ACTIVE_CONSOLE:
                        ACTIVE_CONSOLE.log_action(msg)

                # 1. Chạy AI code agent (ghi nhật ký chi tiết từng bước)
                agent_report = execute_mobile_prompt(text, gemini_key, model_name=selected_model, status_callback=update_cb)

                # 2. Tự động commit, push & deploy nếu có thay đổi
                deploy_report = check_and_deploy_changes(text)

                # 3. Kết thúc Live Console (cập nhật bảng điều khiển cuối và lưu lịch sử)
                if ACTIVE_CONSOLE:
                    ACTIVE_CONSOLE.finish(agent_report, deploy_report)
                    ACTIVE_CONSOLE = None

        except KeyboardInterrupt:
            print("\n[!] Dừng Bot theo yêu cầu người dùng.")
            break
        except Exception as e:
            print(f"[!] Lỗi vòng lặp chính: {e}")
            traceback.print_exc()
            time.sleep(3)

if __name__ == "__main__":
    run_bot()

