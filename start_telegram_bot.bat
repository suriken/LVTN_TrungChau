@echo off
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
title Antigravity Mobile Telegram Bot - LVTN_TrungChau
cd /d "%~dp0"

echo =======================================================================
echo     ANTIGRAVITY MOBILE BOT - DIEU KHIEN VA DEPLOY DU AN TU IPHONE
echo =======================================================================
echo.

if not exist telegram_config.json goto :no_config
goto :run_bot

:no_config
echo [!] Chua tim thay file telegram_config.json!
echo Dang tao file mau telegram_config.json...
copy telegram_config.example.json telegram_config.json > nul
echo.
echo Vui long mo file telegram_config.json va dien cac thong tin:
echo 1. telegram_bot_token
echo 2. telegram_chat_id
echo 3. gemini_api_key
echo.
pause
notepad telegram_config.json
exit /b

:run_bot
python -u telegram_agent_bot.py
pause
