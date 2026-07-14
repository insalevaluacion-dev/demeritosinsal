@echo off
title INSAL Demeritos - Railway
cd /d "%~dp0demeritos"

if not exist ".env.railway" (
  echo.
  echo [ERROR] Falta el archivo demeritos\.env.railway
  echo.
  echo Crea demeritos\.env.railway con al menos:
  echo   DATABASE_URL=postgresql://usuario:pass@host.railway.app:puerto/railway
  echo   DB_SCHEMA=demeritos
  echo   NODE_ENV=development
  echo.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado. Instala Node 20+ desde https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install fallo
    pause
    exit /b 1
  )
)

echo.
echo ========================================
echo  INSAL - Sistema de Demeritos
echo  Modo: LOCAL + Base de datos RAILWAY
echo  URL: http://localhost:3000
echo ========================================
echo.

call npm run dev:railway

pause
