@echo off
title INSAL - Desplegar en Railway
cd /d "%~dp0demeritos"

echo.
echo ========================================
echo  Desplegar INSAL Demeritos en Railway
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Instala Node.js 20+
  pause
  exit /b 1
)

echo [1/5] Iniciando sesion en Railway...
call npx @railway/cli login
if errorlevel 1 (
  echo [ERROR] No se pudo iniciar sesion en Railway
  pause
  exit /b 1
)

echo.
echo [2/5] Vincular proyecto (elige el proyecto con PostgreSQL INSAL)...
call npx @railway/cli link

echo.
echo [3/5] Variables de entorno en Railway (servicio WEB)...
echo   DB_SCHEMA=demeritos
echo   NODE_ENV=production
echo   JWT_SECRET= (genera uno seguro)
echo   DATABASE_URL= (referencia al Postgres del mismo proyecto)
echo.
call npx @railway/cli variables set DB_SCHEMA=demeritos NODE_ENV=production

echo.
echo [4/5] Desplegando desde carpeta demeritos...
call npx @railway/cli up --detach

echo.
echo [5/5] Dominio publico...
call npx @railway/cli domain

echo.
echo Cuando tengas la URL (ej. https://xxx.up.railway.app), ejecuta:
echo   node scripts/railway-deploy-setup.mjs https://TU-URL.railway.app
echo   npm run cap:sync
echo.
pause
