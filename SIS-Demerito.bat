@echo off
setlocal enabledelayedexpansion
title Sistema Demerito - INSAL

:: ====== CONFIGURACION ======
:: Carpeta del proyecto = donde esta este .bat (funciona en C:\, E:\, etc.)
set "PROJECT_DIR=%~dp0"
set "APP_DIR=%PROJECT_DIR%demeritos"
set "DEV_COMMAND=npm run dev:railway"
set "PORT=3000"
set "URL=http://localhost:%PORT%/login"
:: ============================

echo.
echo ========================================
echo  INSAL - Sistema de Demeritos
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado.
    echo Instala Node.js 20+ desde https://nodejs.org
    echo.
    pause
    exit /b 1
)

if not exist "%APP_DIR%\.env.railway" (
    echo [ERROR] Falta el archivo: demeritos\.env.railway
    echo.
    echo Copialo desde tu otra laptop o crealo con:
    echo   DATABASE_URL=postgresql://usuario:pass@host.railway.app:puerto/railway
    echo   DB_SCHEMA=demeritos
    echo   NODE_ENV=development
    echo.
    pause
    exit /b 1
)

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
