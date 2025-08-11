@echo off
REM RijFlow iOS Capacitor Fix Script voor Windows
REM Dit script bereidt de app voor op iOS build (moet op Mac worden afgemaakt)

echo 🔧 RijFlow iOS Capacitor Fix Script voor Windows
echo ================================================

echo 🧹 iOS project opschonen...
REM Verwijder iOS build bestanden handmatig (Capacitor 7.4.2 heeft geen 'clean' commando)
if exist "ios\App\build" rmdir /s /q "ios\App\build"
if exist "ios\App\DerivedData" rmdir /s /q "ios\App\DerivedData"

echo 📦 Dependencies installeren...
call npm install

echo 🔨 Web app builden...
call npm run build

echo 🔄 Capacitor synchroniseren...
call npx cap sync ios

echo.
echo ✅ Windows fix voltooid!
echo.
echo 📱 Volgende stappen op Mac:
echo 1. Kopieer de hele projectmap naar je Mac
echo 2. Voer uit: chmod +x scripts/fix-ios-capacitor.sh
echo 3. Voer uit: ./scripts/fix-ios-capacitor.sh
echo.
echo 🔧 Of handmatig:
echo 1. npx cap open ios
echo 2. Product → Clean Build Folder
echo 3. Product → Build
echo.
echo ⚠️  Let op: iOS builds moeten op macOS worden uitgevoerd! 