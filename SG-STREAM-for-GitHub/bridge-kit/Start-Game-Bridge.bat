@echo off
setlocal
title SG STREAM - Game Bridge
cd /d "%~dp0"
set "NODE=node"
where node >nul 2>nul
if errorlevel 1 (
  if exist "%~dp0node\node.exe" (
    set "NODE=%~dp0node\node.exe"
  ) else (
    echo Node.js was not found. Downloading a private copy ^(about 30 MB, one time only^)...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0get-node.ps1"
    if not exist "%~dp0node\node.exe" (
      echo.
      echo Could not download Node.js. Install it from https://nodejs.org and run this file again.
      pause
      exit /b 1
    )
    set "NODE=%~dp0node\node.exe"
  )
)
"%NODE%" "%~dp0game-bridge.js" %*
echo.
echo The bridge stopped.
pause