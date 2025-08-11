#!/bin/bash

# RijFlow Complete iOS Fix Script
# Dit script doet een complete reset van het iOS project

echo "🔧 RijFlow Complete iOS Fix Script"
echo "=================================="

# Controleer of we op macOS zijn
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Dit script moet op macOS worden uitgevoerd"
    exit 1
fi

echo "🧹 Complete iOS project reset..."
echo "⚠️  Dit verwijdert alle iOS build bestanden en cache!"

# Verwijder alle iOS build bestanden
rm -rf ios/App/build
rm -rf ios/App/DerivedData
rm -rf ios/App/Pods
rm -rf ios/App/Podfile.lock

echo "📦 Dependencies installeren..."
npm install

echo "🔨 Web app builden..."
npm run build

echo "🔄 Capacitor volledig resetten..."
npx cap remove ios
npx cap add ios

echo "📱 Xcode project openen..."
npx cap open ios

echo ""
echo "✅ Complete reset voltooid!"
echo ""
echo "🔧 Volgende stappen in Xcode:"
echo "1. Wacht tot Xcode klaar is met indexeren"
echo "2. Product → Clean Build Folder"
echo "3. Product → Build"
echo "4. Run op simulator of device"
echo ""
echo "⚠️  Belangrijk:"
echo "- De app heeft nu een volledig nieuwe iOS configuratie"
echo "- Alle oude build bestanden zijn verwijderd"
echo "- Capacitor is opnieuw geïnstalleerd"
echo ""
echo "📖 Als het probleem blijft bestaan, zie iOS_BLACK_SCREEN_FIX.md" 