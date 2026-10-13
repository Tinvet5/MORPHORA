@echo off
setlocal
cd /d "%~dp0\..\.."
echo MORPHORA Histology v0.8.1 - Hueso-4 local DZI pilot
echo.
python tools\histology_wsi\pilot_slide.py --slide-id hueso-4 --serve
if errorlevel 1 (
  echo.
  echo The pilot could not start. If Hueso-4 has not been converted yet, run prepare_hueso4_pilot.cmd first.
)
pause
