#!/bin/bash

# RijFlow iOS App Icon Structure Fix Script
# Dit script converteert imageset naar appiconset voor iOS app icons

echo "🎨 RijFlow iOS App Icon Structure Fix Script"
echo "============================================="

# Controleer of we op macOS zijn
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Dit script moet op macOS worden uitgevoerd"
    exit 1
fi

echo "✅ Vereisten gecontroleerd"

# Ga naar Assets directory
cd ios/App/App/Assets.xcassets

echo "🔍 Huidige app icon structuur analyseren..."

# Controleer of AppIcon3.imageset bestaat (heeft de 1024x1024 versie)
if [ ! -d "AppIcon3.imageset" ]; then
    echo "❌ AppIcon3.imageset niet gevonden"
    exit 1
fi

# Controleer of 1024x1024 icon bestaat
if [ ! -f "AppIcon3.imageset/rijflow_icon_1024.png" ]; then
    echo "❌ rijflow_icon_1024.png niet gevonden in AppIcon3.imageset"
    exit 1
fi

echo "✅ 1024x1024 app icon gevonden"

# Maak AppIcon.appiconset directory
echo "📁 AppIcon.appiconset directory maken..."
rm -rf AppIcon.appiconset
mkdir -p AppIcon.appiconset

# Kopieer 1024x1024 icon naar AppIcon.appiconset
echo "📋 App icon kopiëren..."
cp AppIcon3.imageset/rijflow_icon_1024.png AppIcon.appiconset/AppIcon-512@2x.png

# Maak correcte Contents.json voor appiconset
echo "📝 AppIcon.appiconset/Contents.json maken..."
cat > AppIcon.appiconset/Contents.json << 'EOF'
{
  "images" : [
    {
      "filename" : "AppIcon-512@2x.png",
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF

echo "✅ AppIcon.appiconset correct geconfigureerd"

# Verwijder oude imageset directories (optioneel)
echo "🧹 Oude imageset directories opruimen..."
rm -rf AppIcon.imageset
rm -rf AppIcon2.imageset
rm -rf AppIcon3.imageset

echo "✅ Oude app icon directories opgeruimd"

# Ga terug naar root directory
cd ../../../

# Sync Capacitor
echo "🔄 Capacitor synchroniseren..."
npx cap sync ios

echo ""
echo "✅ App Icon structuur fix voltooid!"
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
echo "💡 De app icon is nu correct geconfigureerd als AppIcon.appiconset" 