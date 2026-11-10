@echo off
title PisoScan server
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download it from https://nodejs.org ^(LTS^), then run this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing packages, first run only...
  call npm install --no-audit --no-fund
  if errorlevel 1 ( pause & exit /b 1 )
)
node scripts\needs-import.mjs
if errorlevel 1 (
  echo Building the database ^(first run or new data^), about 1 minute...
  call npm run import
  if errorlevel 1 ( pause & exit /b 1 )
)
echo.
echo PisoScan is starting at http://localhost:4100  ^(close this window to stop it^)
start "" cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:4100"
call npm run dev -- -p 4100
pause
