@echo off
title Campus Skill Exchange - Launcher
echo ========================================================
echo   Starting Student Skill Exchange Platform
echo ========================================================
echo.

set "ROOT=%~dp0"
set "PATH=C:\Users\Tanvi\nodejs;%PATH%"

echo [1/3] Checking Database...
if not exist "%ROOT%backend\skill_exchange.db" (
    echo Initializing database...
    "%ROOT%venv\Scripts\python.exe" "%ROOT%backend\seed.py"
)

echo [2/3] Starting Flask Backend on http://127.0.0.1:5000 ...
start "Skill Exchange - Backend API" cmd /k "cd /d "%ROOT%" && "%ROOT%venv\Scripts\python.exe" backend\run.py"

echo [3/3] Starting React Frontend on http://localhost:5173 ...
start "Skill Exchange - Frontend" cmd /k "cd /d "%ROOT%frontend" && set "PATH=C:\Users\Tanvi\nodejs;%%PATH%%" && C:\Users\Tanvi\nodejs\npm.cmd run dev"

echo.
echo ========================================================
echo Both servers are launching in separate windows!
echo Opening browser at http://localhost:5173 ...
echo ========================================================

timeout /t 3 >nul
start http://localhost:5173
