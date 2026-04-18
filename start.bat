@echo off
SET NODE_PATH=C:\Users\Professional\nodejs\node-v22.16.0-win-x64
SET PATH=%NODE_PATH%;%PATH%
cd /d "%~dp0"
echo ====================================
echo  Сайт кафедры математики — ТГЭУ
echo ====================================
echo  Сайт:       http://localhost:3000
echo  Админ:      http://localhost:3000/admin
echo  Логин:      admin
echo  Пароль:     admin123
echo ====================================
node server.js
pause
