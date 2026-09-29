@echo off
setlocal
cd /d "%~dp0"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm nao foi encontrado.
  echo Execute setup-windows.cmd primeiro.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Dependencias ainda nao foram instaladas.
  echo Execute setup-windows.cmd primeiro.
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   Power BI Web Dashboard
echo ============================================================
echo.
echo Quando o servidor iniciar, abra:
echo http://localhost:5173
echo.
echo Para encerrar, pressione Ctrl+C.
echo.

call npm.cmd run dev
