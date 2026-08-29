@echo off
echo ======================================================================
echo   Launching with Docker Compose: ARP Network Monitoring System
echo ======================================================================
docker compose up --build -d
if %errorlevel% neq 0 (
    echo.
    echo [-] Docker compose failed. Ensure Docker Desktop is running.
    pause
    exit /b %errorlevel%
)
echo.
echo [+] Application stack is live!
echo [+] Open in browser: http://localhost:8080
echo.
pause

