@echo off
echo.
echo ════════════════════════════════════════════════════════════
echo   LEAD SCRAPER WITH AGENT-REACH
echo ════════════════════════════════════════════════════════════
echo.

echo Checking Python...
python --version
if errorlevel 1 (
    echo.
    echo ERROR: Python is not installed!
    echo Download from: https://python.org
    echo Remember to check "Add Python to PATH" during install
    pause
    exit /b
)

echo.
echo Installing packages...
pip install -r requirements.txt

echo.
echo ════════════════════════════════════════════════════════════
echo.
echo Running scraper...
echo.
python scraper.py

echo.
echo Done! Check leads_output.xlsx for results
pause
