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
    if exist "%ENV_EXAMPLE%" (
        echo Creando .env.railway desde la plantilla...
        copy /Y "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
        echo.
        echo IMPORTANTE: Debes pegar tu DATABASE_URL de Railway.
        echo.
        echo Opcion 1 - Copiar desde la otra laptop:
        echo   Copia el archivo demeritos\.env.railway a esta carpeta
        echo.
        echo Opcion 2 - Sacarlo de Railway:
        echo   railway.app -^> tu proyecto PostgreSQL -^> Variables -^> DATABASE_URL
        echo.
        echo Se abrira el archivo para que lo edites. Guarda y vuelve a ejecutar este .bat
        echo.
        notepad "%ENV_FILE%"
        pause
        exit /b 1
    ) else (
        echo Crea el archivo demeritos\.env.railway con:
        echo   DATABASE_URL=postgresql://usuario:pass@host.railway.app:puerto/railway
        echo   DB_SCHEMA=demeritos
        echo   NODE_ENV=development
        echo.
        pause
        exit /b 1
    )
)

findstr /I /C:"CONTRASEÑA" /C:"usuario:pass" /C:"PUERTO" "%ENV_FILE%" >nul 2>&1
if not errorlevel 1 (
    echo [ERROR] demeritos\.env.railway aun tiene datos de ejemplo.
    echo.
    echo Abre el archivo y pega tu DATABASE_URL real de Railway.
    echo.
    notepad "%ENV_FILE%"
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
