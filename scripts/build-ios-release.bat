@echo off
REM RijFlow iOS Build Script voor Windows
REM Dit script bereidt de app voor op iOS build (moet op Mac worden afgemaakt)

echo 🚀 RijFlow iOS Build Script voor Windows
echo ========================================

echo 📦 Dependencies installeren...
call npm install

echo 🔨 Web app builden met static export...
call npm run build:static

echo 🔄 Capacitor synchroniseren...
call npx cap sync ios

echo.
echo ✅ Windows build voltooid!
echo.
echo 📱 Volgende stappen op Mac:
echo 1. Kopieer de hele projectmap naar je Mac
echo 2. Voer uit: chmod +x scripts/build-ios.sh
echo 3. Voer uit: ./scripts/build-ios.sh
echo.
echo 🔧 Of handmatig:
echo 1. npx cap open ios
echo 2. Build in Xcode
echo.
echo ⚠️  Let op: iOS builds moeten op macOS worden uitgevoerd! 