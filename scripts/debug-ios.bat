@echo off
REM RijFlow iOS Debug Script voor Windows
REM Dit script diagnosticeert iOS problemen

echo 🔍 RijFlow iOS Debug Script voor Windows
echo =======================================

echo 🔍 Capacitor status controleren...
call npx cap doctor ios

echo.
echo 📁 iOS project structuur controleren...
dir ios\App\
echo.
echo 📁 iOS App directory:
dir ios\App\App\

echo.
echo 🔧 Capacitor configuratie controleren...
type capacitor.config.ts

echo.
echo 📦 Package.json controleren...
findstr /C:"capacitor" package.json

echo.
echo 🧹 iOS project opschonen...
if exist "ios\App\build" rmdir /s /q "ios\App\build"
if exist "ios\App\DerivedData" rmdir /s /q "ios\App\DerivedData"
if exist "ios\App\Pods" rmdir /s /q "ios\App\Pods"
if exist "ios\App\Podfile.lock" del "ios\App\Podfile.lock"

echo.
echo 📦 Dependencies installeren...
call npm install

echo.
echo 🔨 Web app builden...
call npm run build

echo.
echo 🔄 Capacitor synchroniseren...
call npx cap sync ios

echo.
echo ✅ Windows debug voltooid!
echo.
echo 📱 Volgende stappen op Mac:
echo 1. Kopieer de hele projectmap naar je Mac
echo 2. Voer uit: chmod +x scripts/debug-ios.sh
echo 3. Voer uit: ./scripts/debug-ios.sh
echo.
echo ⚠️  Let op: iOS builds moeten op macOS worden uitgevoerd! 