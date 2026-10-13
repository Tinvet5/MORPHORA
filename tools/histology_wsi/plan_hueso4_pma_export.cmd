@echo off
setlocal
cd /d "%~dp0\..\.."
echo.
echo MORPHORA Histology v0.8.2 - Hueso-4 PMA export preflight
echo PMA.start must be running before this check.
echo.
python tools\histology_wsi\export_from_pma.py --slide-id hueso-4 --plan
set EXITCODE=%ERRORLEVEL%
echo.
if not "%EXITCODE%"=="0" echo Preflight failed. Copy the output and send it to Gideon.
pause
exit /b %EXITCODE%
