@echo off
REM Crea los audios de todos los cuentos de la carpeta "cuentos" y actualiza la biblioteca.
REM Doble clic para ejecutar. Solo se vuelven a crear los audios de las líneas que cambiaron.
chcp 65001 >nul
cd /d "%~dp0"
python generar_cuento.py --todos
echo.
pause
