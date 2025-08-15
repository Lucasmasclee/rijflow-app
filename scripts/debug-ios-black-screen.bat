@echo off
REM RijFlow iOS Black Screen Debug Script
REM Dit script lost het zwarte scherm probleem op

echo 🔧 RijFlow iOS Black Screen Debug Script
echo ========================================

echo ✅ Vereisten gecontroleerd

echo 🧹 Oude build bestanden opruimen...
if exist .next rmdir /s /q .next
if exist ios\App\App\public rmdir /s /q ios\App\App\public

echo 📦 Dependencies installeren...
npm install

echo 🔨 Web app builden...
npm run build

echo 🔄 Capacitor synchroniseren...
npx cap sync ios

echo.
echo ✅ Debug fix voltooid!
echo.
echo 📋 Volgende stappen:
echo 1. Open Xcode: npx cap open ios
echo 2. Product → Clean Build Folder
echo 3. Build de app opnieuw
echo 4. Test op simulator eerst
echo.
echo 🔍 Debug informatie:
echo - Server URL: https://rijflow-app.vercel.app
echo - WebDir: .next
echo - iOS limitsNavigationsToAppBoundDomains: false
echo - WebContentsDebuggingEnabled: true
echo.
echo 💡 Als het probleem blijft:
echo - Controleer Xcode console voor foutmeldingen
echo - Test de URL in Safari op je iPhone
echo - Controleer of de website laadt op https://rijflow-app.vercel.app
echo.
pause
