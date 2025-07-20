@echo off
REM RijFlow iOS Release Build Script voor Windows
REM Gebruik dit script om de app voor te bereiden voor iOS build op Mac

echo 🚀 RijFlow iOS Release Build Script voor Windows
echo ===============================================

REM Controleer of Node.js is geïnstalleerd
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is niet geïnstalleerd. Download van https://nodejs.org/
    pause
    exit /b 1
)

REM Lees huidige versie uit package.json
for /f "tokens=*" %%i in ('node -p "require('./package.json').version"') do set CURRENT_VERSION=%%i
echo 📱 Huidige versie: %CURRENT_VERSION%

REM Installeer dependencies
echo 📦 Dependencies installeren...
call npm install

REM Build de web app
echo 🔨 Web app builden...
call npm run build

REM Sync met Capacitor
echo 🔄 Capacitor synchroniseren...
call npx cap sync

echo.
echo ✅ Windows build voltooid!
echo.
echo 📋 Volgende stappen:
echo 1. Kopieer dit project naar een Mac computer
echo 2. Run op Mac: chmod +x scripts/build-ios-release.sh
echo 3. Run op Mac: ./scripts/build-ios-release.sh
echo 4. Open Xcode en archive de app
echo 5. Upload naar App Store Connect
echo.
echo 📖 Zie app-store-connect.md voor volledige handleiding
echo.
pause 