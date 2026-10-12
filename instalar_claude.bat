@echo off
chcp 65001 > nul
title Instalador MCP Charbela para Claude Desktop

echo ==============================================================
echo   🍰 Instalador Oficial: MCP Charbela CRM para Claude Desktop
echo ==============================================================
echo.

:: 1. Comprobar Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] No se encontro Node.js en esta computadora.
    echo Por favor instala Node.js desde https://nodejs.org antes de continuar.
    echo.
    pause
    exit /b 1
)

echo [1/3] Node.js detectado correctamente.
echo [2/3] Instalando dependencias del servidor MCP...
cd /d "%~dp0"
call npm install --omit=dev --silent

echo [3/3] Configurando Claude Desktop...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_config.ps1"

echo.
echo ==============================================================
echo   🎉 ¡Instalacion completada con exito!
echo   Reinicia tu aplicacion Claude Desktop para comenzar.
echo ==============================================================
echo.
pause
