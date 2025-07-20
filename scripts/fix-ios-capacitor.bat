@echo off
REM RijFlow iOS Capacitor Fix Script voor Windows
REM Dit script bereidt het project voor voor de Mac fix

echo 🔧 RijFlow iOS Capacitor Fix Script voor Windows
echo ===============================================

REM Controleer of Node.js is geïnstalleerd
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is niet geïnstalleerd. Download van https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js gecontroleerd

REM Installeer dependencies
echo 📦 Dependencies installeren...
call npm install

REM Sync met Capacitor
echo 🔄 Capacitor synchroniseren...
call npx cap sync ios

echo.
echo ✅ Windows voorbereiding voltooid!
echo.
echo 📋 Volgende stappen op Mac:
echo 1. Kopieer dit project naar een Mac computer
echo 2. Run op Mac: chmod +x scripts/fix-ios-capacitor.sh
echo 3. Run op Mac: ./scripts/fix-ios-capacitor.sh
echo 4. Open Xcode en gebruik het .xcworkspace bestand
echo 5. Product → Clean Build Folder
echo 6. Build de app opnieuw
echo.
echo 💡 Belangrijk: Gebruik altijd het .xcworkspace bestand, niet .xcodeproj
echo.
pause 