@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================================
echo   Power BI Web Dashboard - Windows Setup
echo ============================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-windows.ps1"
set EXITCODE=%ERRORLEVEL%

echo.
if not "%EXITCODE%"=="0" (
  echo Setup terminou com erro ^(codigo %EXITCODE%^).
  echo Leia a mensagem acima para saber o que corrigir.
) else (
  echo Setup concluido com sucesso.
  echo Para iniciar o projeto, execute: start-windows.cmd
)

echo.
pause
exit /b %EXITCODE%
