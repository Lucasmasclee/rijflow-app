#!/bin/bash

# RijFlow iOS App Icon Fix Script
# Dit script lost app icon problemen op

echo "🎨 RijFlow iOS App Icon Fix Script"
echo "=================================="

# Controleer of we op macOS zijn
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Dit script moet op macOS worden uitgevoerd"
    exit 1
fi

echo "✅ Vereisten gecontroleerd"

# Controleer of app icon bestaat
if [ ! -d "ios/App/App/Assets.xcassets/AppIcon.appiconset" ]; then
    echo "❌ AppIcon.appiconset directory niet gevonden"
    echo "📁 Controleer: ios/App/App/Assets.xcassets/AppIcon.appiconset"
    exit 1
fi

echo "✅ AppIcon.appiconset gevonden"

# Controleer of app icon bestand bestaat
if [ ! -f "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png" ]; then
    echo "❌ AppIcon-512@2x.png niet gevonden"
    echo "📁 Controleer: ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
    exit 1
fi

echo "✅ AppIcon-512@2x.png gevonden"

# Controleer Info.plist configuratie
if grep -q "CFBundleIcons" "ios/App/App/Info.plist"; then
    echo "✅ CFBundleIcons configuratie gevonden in Info.plist"
else
    echo "⚠️  CFBundleIcons configuratie ontbreekt in Info.plist"
    echo "📝 Voeg handmatig toe of run het fix script opnieuw"
fi

# Sync Capacitor
echo "🔄 Capacitor synchroniseren..."
npx cap sync ios

echo ""
echo "✅ App Icon fix voltooid!"
echo ""
echo "📋 Volgende stappen in Xcode:"
echo "1. Open ios/App/App.xcworkspace"
echo "2. Selecteer App target"
echo "3. Ga naar General tab"
echo "4. Controleer App Icons and Launch Images sectie"
echo "5. Zorg dat App Icons Source op 'AppIcon' staat"
echo "6. Clean Build Folder (Product → Clean Build Folder)"
echo "7. Build de app opnieuw"
echo ""
echo "💡 Als het probleem blijft:"
echo "   - Controleer Xcode project settings"
echo "   - Zorg dat AppIcon.appiconset correct is geconfigureerd" 