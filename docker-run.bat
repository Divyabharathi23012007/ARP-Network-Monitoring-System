@echo off
echo ======================================================================
echo   Running Docker Container: ARP Network Monitoring System
echo ======================================================================
docker stop arp-network-monitor-app >nul 2>&1
docker rm arp-network-monitor-app >nul 2>&1

docker run -d -p 8080:8080 --name arp-network-monitor-app arp-network-monitor:latest
if %errorlevel% neq 0 (
    echo.
    echo [-] Failed to run container. Ensure Docker Desktop is running.
    pause
    exit /b %errorlevel%
)
echo.
echo [+] Container is running in background!
echo [+] Open in browser: http://localhost:8080
echo.
pause

