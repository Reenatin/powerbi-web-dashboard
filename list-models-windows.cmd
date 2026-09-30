@echo off
setlocal
cd /d "%~dp0"

set "LOCAL_NODE=%~dp0.tools\node"
if exist "%LOCAL_NODE%\node.exe" (
  set "PATH=%LOCAL_NODE%;%PATH%"
)

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

call npm.cmd run list-models
set EXITCODE=%ERRORLEVEL%

echo.
pause
exit /b %EXITCODE%
