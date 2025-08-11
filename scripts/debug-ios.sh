#!/bin/bash

# RijFlow iOS Debug Script
# Dit script diagnosticeert en lost iOS problemen op

echo "🔍 RijFlow iOS Debug Script"
echo "==========================="

# Controleer of we op macOS zijn
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Dit script moet op macOS worden uitgevoerd"
    exit 1
fi

echo "🔍 Capacitor status controleren..."
npx cap doctor ios

echo ""
echo "📁 iOS project structuur controleren..."
ls -la ios/App/
echo ""
echo "📁 iOS App directory:"
ls -la ios/App/App/

echo ""
echo "🔧 Capacitor configuratie controleren..."
cat capacitor.config.ts

echo ""
echo "📦 Package.json controleren..."
grep -A 10 -B 5 "capacitor" package.json

echo ""
echo "🧹 iOS project opschonen..."
rm -rf ios/App/build
rm -rf ios/App/DerivedData
rm -rf ios/App/Pods
rm -rf ios/App/Podfile.lock

echo ""
echo "📦 Dependencies installeren..."
npm install

echo ""
echo "🔨 Web app builden..."
npm run build

echo ""
echo "🔄 Capacitor synchroniseren..."
npx cap sync ios

echo ""
echo "📱 Xcode project openen..."
npx cap open ios

echo ""
echo "✅ Debug voltooid!"
echo ""
echo "🔍 Controleer in Xcode:"
echo "1. Of alle bestanden correct zijn geladen"
echo "2. Of er foutmeldingen zijn in de console"
echo "3. Of de Capacitor bridge correct wordt geïnitialiseerd"
echo ""
echo "📖 Zie iOS_BLACK_SCREEN_FIX.md voor meer informatie" 