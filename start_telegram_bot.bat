@echo off
chcp 65001 > nul
title Antigravity Mobile Telegram Bot - LVTN_TrungChau
cd /d "%~dp0"

echo =======================================================================
echo     ANTIGRAVITY MOBILE BOT - ĐIỀU KHIỂN & DEPLOY DỰ ÁN TỪ IPHONE
echo =======================================================================
echo.

if not exist telegram_config.json (
    echo [!] Chưa tìm thấy file telegram_config.json!
    echo Đang tạo file cấu hình mẫu...
    copy telegram_config.example.json telegram_config.json > nul
    echo.
    echo 👉 Vui lòng mở file telegram_config.json và điền:
    echo    1. telegram_bot_token (lấy từ @BotFather trên Telegram)
    echo    2. telegram_chat_id (hoặc để trống, gửi /start từ bot sẽ tự nhận)
    echo    3. gemini_api_key (lấy miễn phí tại: https://aistudio.google.com/app/api-keys)
    echo.
    pause
    notepad telegram_config.json
    exit /b
)

python telegram_agent_bot.py

pause
