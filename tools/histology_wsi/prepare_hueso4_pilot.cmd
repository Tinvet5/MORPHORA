@echo off
setlocal
cd /d "%~dp0\..\.."
echo MORPHORA Histology v0.8.1 - Prepare Hueso-4 pilot
echo.
set "INPUT=%~1"
if "%INPUT%"=="" (
  set /p "INPUT=Path to a libvips/OpenSlide-readable Hueso-4 export: "
)
if "%INPUT%"=="" (
  echo No input selected.
  pause
  exit /b 2
)
python tools\histology_wsi\pilot_slide.py --slide-id hueso-4 --input "%INPUT%" --serve
if errorlevel 1 (
  echo.
  echo If the source is MDSX and libvips cannot read it, export it first to a compatible pyramidal TIFF, OME-TIFF, or SVS master and rerun this helper.
)
pause
