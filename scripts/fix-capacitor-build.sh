#!/bin/bash

# RijFlow Capacitor Build Fix Script
# Dit script lost het TypeScript copy probleem op

echo "🔧 RijFlow Capacitor Build Fix Script"
echo "====================================="

# Controleer of we op macOS zijn
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Dit script moet op macOS worden uitgevoerd"
    exit 1
fi

echo "🧹 iOS project opschonen..."
rm -rf ios/App/build
rm -rf ios/App/DerivedData
rm -rf ios/App/Pods
rm -rf ios/App/Podfile.lock

echo "📦 Dependencies installeren..."
npm install

echo "🔨 Web app builden..."
npm run build

echo "🔄 Capacitor synchroniseren..."
npx cap sync ios

echo "🔧 TypeScript bestanden verwijderen uit iOS project..."
# Verwijder TypeScript bestanden die problemen veroorzaken
find ios/App/App -name "*.ts" -type f -delete
find ios/App/App -name "*.tsx" -type f -delete
find ios/App/App -name "*.map" -type f -delete

echo "📱 Xcode project openen..."
npx cap open ios

echo ""
echo "✅ Build fix voltooid!"
echo ""
echo "🔧 Volgende stappen in Xcode:"
echo "1. Product → Clean Build Folder"
echo "2. Product → Build"
echo "3. Run op simulator of device"
echo ""
echo "⚠️  Belangrijk:"
echo "- TypeScript bestanden zijn verwijderd uit iOS project"
echo "- Alleen gecompileerde bestanden blijven over"
echo "- Dit zou het zwarte scherm moeten oplossen" 