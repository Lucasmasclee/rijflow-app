@echo off
REM RijFlow Capacitor Build Fix Script voor Windows
REM Dit script bereidt de app voor op een Capacitor build fix

echo 🔧 RijFlow Capacitor Build Fix Script voor Windows
echo ================================================

echo 🧹 iOS project opschonen...
if exist "ios\App\build" rmdir /s /q "ios\App\build"
if exist "ios\App\DerivedData" rmdir /s /q "ios\App\DerivedData"
if exist "ios\App\Pods" rmdir /s /q "ios\App\Pods"
if exist "ios\App\Podfile.lock" del "ios\App\Podfile.lock"

echo 📦 Dependencies installeren...
call npm install

echo 🔨 Web app builden...
call npm run build

echo 🔄 Capacitor synchroniseren...
call npx cap sync ios

echo 🔧 TypeScript bestanden verwijderen uit iOS project...
REM Verwijder TypeScript bestanden die problemen veroorzaken
for /r "ios\App\App" %%f in (*.ts) do del "%%f" 2>nul
for /r "ios\App\App" %%f in (*.tsx) do del "%%f" 2>nul
for /r "ios\App\App" %%f in (*.map) do del "%%f" 2>nul

echo.
echo ✅ Windows build fix voltooid!
echo.
echo 📱 Volgende stappen op Mac:
echo 1. Kopieer de hele projectmap naar je Mac
echo 2. Voer uit: chmod +x scripts/fix-capacitor-build.sh
echo 3. Voer uit: ./scripts/fix-capacitor-build.sh
echo.
echo ⚠️  Let op: iOS builds moeten op macOS worden uitgevoerd!
echo.
echo 🔧 Dit script heeft het TypeScript copy probleem opgelost 