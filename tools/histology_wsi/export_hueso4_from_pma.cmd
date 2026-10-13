@echo off
setlocal
cd /d "%~dp0\..\.."
echo.
echo MORPHORA Histology v0.8.2 - Export Hueso-4 from PMA.start
echo Keep PMA.start open until EXPORT COMPLETE appears.
echo The exporter is resumable if interrupted.
echo.
python tools\histology_wsi\export_from_pma.py --slide-id hueso-4 --serve
set EXITCODE=%ERRORLEVEL%
echo.
if not "%EXITCODE%"=="0" echo Export/server exited with code %EXITCODE%.
pause
exit /b %EXITCODE%
