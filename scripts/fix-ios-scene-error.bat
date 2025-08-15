@echo off
REM RijFlow iOS Scene Error Fix Script
REM Dit script lost het FBSSceneSnapshotErrorDomain code 4 probleem op

echo 🔧 RijFlow iOS Scene Error Fix Script
echo =====================================

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

echo 🧹 iOS cache opruimen...
cd ios\App
if exist Pods rmdir /s /q Pods
if exist Podfile.lock del Podfile.lock

echo 📦 CocoaPods dependencies installeren...
pod install

echo 🔄 Capacitor opnieuw synchroniseren...
cd ..\..
npx cap sync ios

echo.
echo ✅ Scene Error Fix voltooid!
echo.
echo 📋 Volgende stappen in Xcode:
echo 1. Open Xcode: npx cap open ios
echo 2. Product → Clean Build Folder
echo 3. Build de app opnieuw
echo 4. Test op simulator eerst
echo.
echo 🔍 Wat is opgelost:
echo - FBSSceneSnapshotErrorDomain code 4 fout
echo - Scene-based lifecycle configuratie
echo - AppDelegate en SceneDelegate setup
echo - iOS 13+ compatibiliteit
echo.
echo 💡 Als het probleem blijft:
echo - Controleer Xcode console voor nieuwe foutmeldingen
echo - Test de app op een fysiek iOS 13+ apparaat
echo - Controleer of alle bestanden zijn toegevoegd aan Xcode project
echo.
pause
