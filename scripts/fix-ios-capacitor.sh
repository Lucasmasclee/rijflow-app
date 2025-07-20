#!/bin/bash

# RijFlow iOS Capacitor Fix Script
# Dit script lost het "No such module 'Capacitor'" probleem op

echo "🔧 RijFlow iOS Capacitor Fix Script"
echo "==================================="

# Controleer of we op macOS zijn
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Dit script moet op macOS worden uitgevoerd"
    exit 1
fi

# Controleer of CocoaPods is geïnstalleerd
if ! command -v pod &> /dev/null; then
    echo "❌ CocoaPods is niet geïnstalleerd"
    echo "📦 Installeer CocoaPods met: sudo gem install cocoapods"
    exit 1
fi

echo "✅ Vereisten gecontroleerd"

# Ga naar iOS directory
cd ios/App

echo "🧹 Oude Pods opruimen..."
rm -rf Pods
rm -rf Podfile.lock

echo "📦 CocoaPods dependencies installeren..."
pod install

echo "🔄 Capacitor synchroniseren..."
cd ../..
npx cap sync ios

echo "🧹 Xcode cache opruimen..."
# Dit moet handmatig in Xcode: Product → Clean Build Folder

echo ""
echo "✅ Fix voltooid!"
echo ""
echo "📋 Volgende stappen in Xcode:"
echo "1. Sluit Xcode volledig"
echo "2. Open Xcode opnieuw"
echo "3. Open het .xcworkspace bestand (NIET .xcodeproj)"
echo "4. Product → Clean Build Folder"
echo "5. Build de app opnieuw"
echo ""
echo "💡 Tip: Gebruik altijd het .xcworkspace bestand, niet .xcodeproj" 