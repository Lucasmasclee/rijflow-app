@echo off
echo 🚀 RijFlow iOS Voorbereiding Script
echo ==================================

echo 📦 Dependencies installeren...
call npm install

echo 🔨 Web app builden...
call npm run build

echo 🔄 Capacitor synchroniseren...
call npx cap sync

echo.
echo ✅ Voorbereiding voltooid!
echo.
echo 📋 Volgende stappen:
echo 1. Kopieer dit project naar een Mac computer
echo 2. Installeer Xcode vanuit de App Store
echo 3. Installeer CocoaPods: sudo gem install cocoapods
echo 4. Voer uit: ./scripts/build-ios.sh
echo 5. Volg de App Store Connect handleiding
echo.
echo 📖 Zie app-store-connect.md voor volledige handleiding
pause 