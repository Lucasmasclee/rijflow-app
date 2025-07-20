# iOS App Icon Structure Fix

## Probleem
Je hebt de app icons veranderd van de juiste `AppIcon.appiconset` structuur naar gewone `imageset` bestanden:
- `AppIcon.imageset` (500px)
- `AppIcon2.imageset` (512px) 
- `AppIcon3.imageset` (1024px)

iOS verwacht app icons in een specifieke `appiconset` structuur, niet in gewone `imageset` bestanden.

## Oplossing

### Stap 1: Automatische Fix (Aanbevolen)

#### Op Mac:
```bash
chmod +x scripts/fix-ios-app-icon-structure.sh
./scripts/fix-ios-app-icon-structure.sh
```

### Stap 2: Handmatige Fix

#### 2.1 Verwijder oude app icon structuur
```bash
cd ios/App/App/Assets.xcassets
rm -rf AppIcon.imageset
rm -rf AppIcon2.imageset
rm -rf AppIcon3.imageset
```

#### 2.2 Maak correcte AppIcon.appiconset
```bash
# Maak directory
mkdir -p AppIcon.appiconset

# Kopieer 1024x1024 icon (van AppIcon3.imageset)
cp AppIcon3.imageset/rijflow_icon_1024.png AppIcon.appiconset/AppIcon-512@2x.png
```

#### 2.3 Maak correcte Contents.json
Maak `AppIcon.appiconset/Contents.json` met deze inhoud:
```json
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
```

#### 2.4 Sync Capacitor
```bash
cd ../../../
npx cap sync ios
```

## Verschil tussen Imageset en Appiconset

### ❌ Imageset (verkeerd voor app icons)
```
AppIcon.imageset/
├── rijflow_icon_500.png
└── Contents.json
```
- Voor gewone afbeeldingen in de app
- Niet voor app icons

### ✅ Appiconset (correct voor app icons)
```
AppIcon.appiconset/
├── AppIcon-512@2x.png  (1024x1024 pixels)
└── Contents.json
```
- Specifiek voor app icons
- Heeft speciale configuratie
- iOS herkent dit automatisch

## Xcode Project Settings

### 1. Open Xcode
```bash
open ios/App/App.xcworkspace
```

### 2. Controleer App Icons Source
1. Selecteer App target
2. Ga naar General tab
3. Scroll naar "App Icons and Launch Images"
4. Zorg dat "App Icons Source" op `AppIcon` staat

### 3. Clean en Build
1. Product → Clean Build Folder
2. Build de app opnieuw

## Troubleshooting

### Probleem 1: App icon nog steeds niet gevonden
```bash
# Controleer of AppIcon.appiconset bestaat
ls -la ios/App/App/Assets.xcassets/AppIcon.appiconset/

# Controleer of bestand correct is gekopieerd
ls -la ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
```

### Probleem 2: Xcode herkent app icon niet
1. Sluit Xcode volledig
2. Verwijder derived data:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
3. Open Xcode opnieuw
4. Open `.xcworkspace` bestand
5. Clean Build Folder

### Probleem 3: Capacitor sync problemen
```bash
# Force sync
npx cap sync ios --force

# Controleer of app icon behouden blijft
ls -la ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

## Veelvoorkomende Fouten

### ❌ Fout: Imageset gebruikt voor app icon
```
Error: None of the input catalogs contained a matching app icon set named "AppIcon"
```
**Oplossing**: Converteer naar appiconset structuur

### ❌ Fout: Verkeerde bestandsnaam
```
Error: App icon file not found
```
**Oplossing**: Gebruik `AppIcon-512@2x.png` als bestandsnaam

### ❌ Fout: Verkeerde directory naam
```
Error: App icon set not found
```
**Oplossing**: Gebruik `AppIcon.appiconset` als directory naam

## Best Practices

### 1. Altijd appiconset gebruiken voor app icons
```bash
# Correcte structuur
AppIcon.appiconset/
├── AppIcon-512@2x.png
└── Contents.json
```

### 2. Gebruik 1024x1024 pixels voor App Store
```bash
# Voor development is 1024x1024 voldoende
# Xcode genereert automatisch andere formaten
```

### 3. Correcte bestandsnaam
```bash
# Gebruik altijd: AppIcon-512@2x.png
# Niet: rijflow_icon_1024.png
```

### 4. Na wijzigingen
```bash
npx cap sync ios
# Open Xcode en clean build folder
```

## Automatisering

### Scripts gebruiken
```bash
# Mac fix
./scripts/fix-ios-app-icon-structure.sh
```

### CI/CD integratie
```yaml
# Voor GitHub Actions
- name: Fix App Icon Structure
  run: |
    # Zorg dat app icon correct is geconfigureerd als appiconset
    # Niet als imageset
```

## Support

### Apple Developer Documentation
- [App Icons](https://developer.apple.com/design/human-interface-guidelines/ios/icons-and-images/app-icon/)

### Capacitor Documentation
- [iOS Configuration](https://capacitorjs.com/docs/ios/configuration)

## Checklist

- [ ] Oude imageset directories verwijderd
- [ ] AppIcon.appiconset directory gemaakt
- [ ] 1024x1024 icon gekopieerd als AppIcon-512@2x.png
- [ ] Correcte Contents.json gemaakt
- [ ] Capacitor gesynchroniseerd
- [ ] Xcode project settings correct
- [ ] Xcode cache opgeruimd
- [ ] Build succesvol

## Timeline

1. **Diagnose**: 5 minuten
2. **Fix uitvoeren**: 10-15 minuten
3. **Testen**: 5 minuten

**Totaal**: 20-25 minuten

## Voorbeelden

### Correcte AppIcon.appiconset/Contents.json
```json
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
```

### Correcte directory structuur
```
ios/App/App/Assets.xcassets/
├── AppIcon.appiconset/     ← Voor app icon
│   ├── AppIcon-512@2x.png
│   └── Contents.json
├── Splash.imageset/        ← Voor splash screen
└── Contents.json
``` 