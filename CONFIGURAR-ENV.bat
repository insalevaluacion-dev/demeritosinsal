@echo off
setlocal enabledelayedexpansion
title Configurar .env.railway - INSAL
cd /d "%~dp0"

if not exist "demeritos\package.json" (
    echo [ERROR] Ejecuta este archivo desde la carpeta raiz del proyecto demeritosinsal
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Instala Node.js 20+ desde https://nodejs.org
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Configurar demeritos\.env.railway
echo ========================================
echo.
echo Pega SOLO la linea DATABASE_URL de Railway.
echo Debe incluir :52223 despues de .net
echo.
echo Ejemplo:
echo postgresql://postgres:XXXX@maglev.proxy.rlwy.net:52223/railway
echo.
set /p "DBURL=DATABASE_URL: "

if "!DBURL!"=="" (
    echo [ERROR] No pegaste nada.
    pause
    exit /b 1
)

:: quitar comillas si las puso
set "DBURL=!DBURL:"=!"
set "DBURL=!DBURL:'=!"

echo !DBURL! | findstr /I "maglev.proxy.rlwy.net:52223" >nul
if errorlevel 1 (
    echo.
    echo [AVISO] La URL no contiene maglev.proxy.rlwy.net:52223
    echo Verifica que tenga los dos puntos antes del puerto.
    echo.
    set /p "CONT=Continuar igual? (S/N): "
    if /i not "!CONT!"=="S" exit /b 1
)

(
echo DATABASE_URL=!DBURL!
echo DB_SCHEMA=demeritos
echo NEXTAUTH_URL=http://localhost:3000
echo NODE_ENV=development
) > "demeritos\.env.railway"

echo.
echo Archivo creado: demeritos\.env.railway
echo.
echo Probando conexion...
cd demeritos
node scripts/test-env-railway.mjs
if errorlevel 1 (
    echo.
    echo La conexion fallo. Revisa internet o vuelve a pegar la URL.
    pause
    exit /b 1
)

echo.
echo Listo. Ahora puedes usar SIS-Demerito.bat
echo.
pause
endlocal
