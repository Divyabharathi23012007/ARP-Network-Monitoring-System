@echo off
echo ======================================================================
echo   Building Docker Container: ARP Network Monitoring System
echo ======================================================================
docker build -t arp-network-monitor:latest .
if %errorlevel% neq 0 (
    echo.
    echo [-] Docker build failed. Ensure Docker Desktop is running.
    pause
    exit /b %errorlevel%
)
echo.
echo [+] Docker Image built successfully: arp-network-monitor:latest
echo [+] Run 'docker-run.bat' or 'docker compose up' to start the container.
pause

