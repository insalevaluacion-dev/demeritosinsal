@echo off
setlocal enabledelayedexpansion
title Sistema Demerito - INSAL

:: ====== CONFIGURACION ======
set "PROJECT_DIR=%~dp0"
set "APP_DIR=%PROJECT_DIR%demeritos"
set "ENV_FILE=%APP_DIR%\.env.railway"
set "ENV_EXAMPLE=%APP_DIR%\.env.railway.example"
set "DEV_COMMAND=npm run dev:railway"
set "PORT=3000"
set "URL=http://localhost:%PORT%/login"
:: ============================

echo.
echo ========================================
echo  INSAL - Sistema de Demeritos
echo ========================================
echo.

if not exist "%APP_DIR%\package.json" (
    echo [ERROR] No se encuentra la carpeta del proyecto.
    echo.
    echo Este archivo debe estar en la carpeta raiz del repo, por ejemplo:
    echo   E:\demeritosinsal\SIS-Demerito.bat
    echo   C:\Users\TU_USUARIO\demeritosinsal\SIS-Demerito.bat
    echo.
    echo La carpeta "demeritos" debe estar al lado de este .bat
    echo.
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado.
    echo Instala Node.js 20+ desde https://nodejs.org
    echo.
    pause
    exit /b 1
)

if not exist "%ENV_FILE%" (
    echo [AVISO] Falta demeritos\.env.railway
    echo.
    echo Ejecuta primero: CONFIGURAR-ENV.bat
    echo.
    if exist "%PROJECT_DIR%CONFIGURAR-ENV.bat" (
        set /p "RUNCFG=Deseas configurarlo ahora? (S/N): "
        if /i "!RUNCFG!"=="S" (
            call "%PROJECT_DIR%CONFIGURAR-ENV.bat"
            if not exist "%ENV_FILE%" exit /b 1
        ) else (
            pause
            exit /b 1
        )
    ) else (
        pause
        exit /b 1
    )
)

cd /d "%APP_DIR%"
node scripts/test-env-railway.mjs >nul 2>&1
if errorlevel 1 (
    echo [ERROR] demeritos\.env.railway tiene un problema.
    echo Ejecuta CONFIGURAR-ENV.bat para corregirlo.
    echo.
    cd /d "%APP_DIR%"
    node scripts/test-env-railway.mjs
    pause
    exit /b 1
)
cd /d "%PROJECT_DIR%"

if not exist "%APP_DIR%\node_modules\" (
    echo [INFO] Primera vez: instalando dependencias...
    cd /d "%APP_DIR%"
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install fallo.
        pause
        exit /b 1
    )
    echo.
)

echo Verificando si el servicio esta activo en el puerto %PORT%...
set "PID="

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    set "PID=%%a"
)

if "!PID!"=="" (
    echo.
    echo [INFO] El servicio NO esta activo. Iniciando proyecto...
    echo.
    cd /d "%APP_DIR%"
    start "INSAL Dev Server" cmd /k "%DEV_COMMAND%"
    echo [INFO] Esperando que el servidor arranque...
    timeout /t 12 /nobreak >nul
    start "" "%URL%"
    echo.
    echo Servicio iniciado. Navegador abierto en:
    echo %URL%
    echo.
    echo No cierres la ventana "INSAL Dev Server".
) else (
    echo.
    echo [INFO] El servicio YA esta activo ^(PID: !PID!, Puerto: %PORT%^).
    echo.
    set /p "CONFIRM=Deseas abrir el sistema? (S/N): "
    if /i "!CONFIRM!"=="S" (
        start "" "%URL%"
        echo Navegador abierto en %URL%
    )
    echo.
    set /p "CONFIRM2=Deseas cerrar el servicio? (S/N): "
    if /i "!CONFIRM2!"=="S" (
        echo Cerrando proceso !PID!...
        taskkill /PID !PID! /F >nul 2>&1
        echo Servicio detenido correctamente.
    ) else (
        echo El servicio sigue activo.
    )
)

echo.
pause
endlocal
