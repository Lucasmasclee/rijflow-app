@echo off
REM RijFlow Complete iOS Fix Script voor Windows
REM Dit script bereidt de app voor op een complete iOS reset

echo 🔧 RijFlow Complete iOS Fix Script voor Windows
echo ==============================================

echo 🧹 iOS project voorbereiden voor reset...
echo ⚠️  Dit verwijdert alle iOS build bestanden en cache!

REM Verwijder alle iOS build bestanden
if exist "ios\App\build" rmdir /s /q "ios\App\build"
if exist "ios\App\DerivedData" rmdir /s /q "ios\App\DerivedData"
if exist "ios\App\Pods" rmdir /s /q "ios\App\Pods"
if exist "ios\App\Podfile.lock" del "ios\App\Podfile.lock"

echo 📦 Dependencies installeren...
call npm install

echo 🔨 Web app builden...
call npm run build

echo 🔄 Capacitor volledig resetten...
call npx cap remove ios
call npx cap add ios

echo.
echo ✅ Windows voorbereiding voltooid!
echo.
echo 📱 Volgende stappen op Mac:
echo 1. Kopieer de hele projectmap naar je Mac
echo 2. Voer uit: chmod +x scripts/complete-ios-fix.sh
echo 3. Voer uit: ./scripts/complete-ios-fix.sh
echo.
echo ⚠️  Let op: iOS builds moeten op macOS worden uitgevoerd!
echo.
echo 🔧 Dit script heeft een complete reset gedaan van het iOS project 