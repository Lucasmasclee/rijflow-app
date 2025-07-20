#!/bin/bash

# RijFlow iOS Release Build Script
# Gebruik dit script op een Mac computer met Xcode geïnstalleerd

echo "🚀 RijFlow iOS Release Build Script"
echo "==================================="

# Controleer of we op macOS zijn
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Dit script moet op macOS worden uitgevoerd"
    exit 1
fi

# Controleer of Xcode is geïnstalleerd
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode is niet geïnstalleerd. Installeer Xcode vanuit de App Store."
    exit 1
fi

# Controleer of CocoaPods is geïnstalleerd
if ! command -v pod &> /dev/null; then
    echo "❌ CocoaPods is niet geïnstalleerd. Installeer met: sudo gem install cocoapods"
    exit 1
fi

echo "✅ Vereisten gecontroleerd"

# Lees huidige versie uit package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📱 Huidige versie: $CURRENT_VERSION"

# Installeer dependencies
echo "📦 Dependencies installeren..."
npm install

# Build de web app
echo "🔨 Web app builden..."
npm run build

# Sync met Capacitor
echo "🔄 Capacitor synchroniseren..."
npx cap sync

# Controleer iOS project
echo "📱 iOS project controleren..."
if [ ! -d "ios/App" ]; then
    echo "❌ iOS project niet gevonden. Run eerst: npx cap add ios"
    exit 1
fi

# Open Xcode
echo "📱 Xcode openen..."
npx cap open ios

echo ""
echo "✅ Build voltooid!"
echo ""
echo "📋 Volgende stappen in Xcode:"
echo "1. Selecteer je Team (Apple Developer Account)"
echo "2. Controleer Bundle Identifier: com.mascelli.rijlesplanner"
echo "3. Controleer Version: $CURRENT_VERSION"
echo "4. Controleer Build: (verhoog dit nummer)"
echo "5. Product → Archive"
echo "6. Distribute App → App Store Connect"
echo "7. Upload naar App Store Connect"
echo ""
echo "📖 Zie app-store-connect.md voor volledige handleiding"
echo ""
echo "🔗 App Store Connect: https://appstoreconnect.apple.com" 