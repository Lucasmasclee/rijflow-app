#!/bin/bash

# RijFlow iOS Capacitor Fix Script
# Dit script lost het zwarte scherm en storyboard problemen op

echo "🔧 RijFlow iOS Capacitor Fix Script"
echo "==================================="

# Controleer of we op macOS zijn
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Dit script moet op macOS worden uitgevoerd"
    exit 1
fi

echo "🧹 Capacitor iOS project opschonen..."
npx cap clean ios

echo "📦 Dependencies installeren..."
npm install

echo "🔨 Web app builden..."
npm run build

echo "🔄 Capacitor synchroniseren..."
npx cap sync ios

echo "📱 Xcode project openen..."
npx cap open ios

echo ""
echo "✅ Fix voltooid!"
echo ""
echo "🔧 Volgende stappen in Xcode:"
echo "1. Product → Clean Build Folder"
echo "2. Product → Build"
echo "3. Run op simulator of device"
echo ""
echo "⚠️  Als het probleem blijft bestaan:"
echo "- Controleer Xcode console voor foutmeldingen"
echo "- Reset iOS Simulator (Device → Erase All Content and Settings)"
echo "- Controleer of alle Capacitor plugins correct zijn geïnstalleerd" 