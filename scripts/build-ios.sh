#!/bin/bash

# RijFlow iOS Build Script
# Gebruik dit script op een Mac computer met Xcode geïnstalleerd

echo "🚀 RijFlow iOS Build Script"
echo "=========================="

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

# Installeer dependencies
echo "📦 Dependencies installeren..."
npm install

# Build de web app met static export (belangrijk voor iOS!)
echo "🔨 Web app builden met static export..."
npm run build:static

# Sync met Capacitor
echo "🔄 Capacitor synchroniseren..."
npx cap sync ios

# Open Xcode
echo "📱 Xcode openen..."
npx cap open ios

echo ""
echo "✅ Build voltooid!"
echo ""
echo "Volgende stappen in Xcode:"
echo "1. Selecteer je Team (Apple Developer Account)"
echo "2. Zet Bundle Identifier op: com.mascelli.rijlesplanner"
echo "3. Zet Version op: 2.0.1"
echo "4. Zet Build op: 3"
echo "5. Product → Archive"
echo "6. Distribute App → App Store Connect"
echo ""
echo "🔧 Belangrijke iOS instellingen:"
echo "- Zorg dat 'Background Modes' is uitgeschakeld"
echo "- Zet 'Status Bar Style' op 'Default'"
echo "- Controleer dat 'Launch Screen' correct is ingesteld"
echo ""
echo "📖 Zie app-store-connect.md voor volledige handleiding" 