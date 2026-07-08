@echo off
title INSAL Demeritos - Compilar APK (Capacitor)
cd /d "%~dp0"

if not exist ".env.capacitor" (
  echo.
  echo [ERROR] Falta .env.capacitor
  echo Copia .env.capacitor.example a .env.capacitor y define CAPACITOR_SERVER_URL
  echo Ejemplo: CAPACITOR_SERVER_URL=https://tu-app.railway.app
  echo.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Instala Node.js 20+ desde https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Instalando dependencias...
  call npm install
)

if not exist "android\" (
  echo Agregando plataforma Android...
  call npx cap add android
)

where java >nul 2>&1
if errorlevel 1 (
  echo.
  echo [AVISO] Java no encontrado. Instala Android Studio:
  echo https://developer.android.com/studio
  echo Luego abre el proyecto con: npm run cap:android
  echo.
)

echo.
echo Sincronizando Capacitor...
call npm run cap:sync
if errorlevel 1 (
  echo [ERROR] cap:sync fallo
  pause
  exit /b 1
)

echo.
echo Compilando APK debug...
cd android
call gradlew.bat assembleDebug
set BUILD_ERR=%ERRORLEVEL%
cd ..

if %BUILD_ERR% neq 0 (
  echo.
  echo [ERROR] Gradle fallo. Abre Android Studio: npm run cap:android
  pause
  exit /b 1
)

echo.
echo ========================================
echo  APK generado:
echo  android\app\build\outputs\apk\debug\app-debug.apk
echo ========================================
echo.
pause
