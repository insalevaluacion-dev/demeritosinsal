@echo off
setlocal enabledelayedexpansion
title Sistema Demerito - INSAL

:: ====== CONFIGURACION ======
set "PROJECT_DIR=%~dp0"
set "APP_DIR=%PROJECT_DIR%demeritos"
set "ENV_FILE=%APP_DIR%\.env.railway"
set "DEV_COMMAND=npm run dev:railway"
set "PORT=3000"
set "URL=http://localhost:%PORT%/login"
set "MAX_WAIT=90"
:: ============================

if not exist "%APP_DIR%\package.json" (
    echo [ERROR] La carpeta "demeritos" debe estar al lado de este .bat
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Instala Node.js 20+ desde https://nodejs.org
    pause
    exit /b 1
)

if not exist "%ENV_FILE%" (
    echo [ERROR] Falta demeritos\.env.railway - ejecuta CONFIGURAR-ENV.bat primero
    if exist "%PROJECT_DIR%CONFIGURAR-ENV.bat" call "%PROJECT_DIR%CONFIGURAR-ENV.bat"
    if not exist "%ENV_FILE%" exit /b 1
)

if not exist "%APP_DIR%\node_modules\" (
    echo [INFO] Instalando dependencias...
    cd /d "%APP_DIR%"
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install fallo.
        pause
        exit /b 1
    )
)

set "PID="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT%" ^| findstr "LISTENING"') do set "PID=%%a"

if "!PID!"=="" (
    echo [INFO] Iniciando servidor...
    cd /d "%APP_DIR%"
    start "INSAL Dev Server" /min cmd /k "%DEV_COMMAND%"
    echo [INFO] Esperando que cargue...
    set /a "TRIES=0"
    :wait_server
    curl.exe -s -o NUL --connect-timeout 2 --max-time 3 "http://127.0.0.1:%PORT%/login" 2>nul
    if not errorlevel 1 goto open_browser
    set /a "TRIES+=1"
    if !TRIES! geq %MAX_WAIT% (
        echo [AVISO] El servidor tarda. Abriendo navegador igual...
        goto open_browser
    )
    timeout /t 1 /nobreak >nul
    goto wait_server
) else (
    echo [INFO] Servidor ya activo.
)

:open_browser
start "" "%URL%"
echo [OK] Navegador abierto: %URL%
timeout /t 3 /nobreak >nul
endlocal
