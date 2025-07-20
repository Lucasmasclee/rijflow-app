# iOS App Icon Fix Handleiding

## Probleem
Je krijgt de error: `"None of the input catalogs contained a matching stickers icon set or app icon set named "AppIcon"."`

## Oorzaak
Dit gebeurt meestal omdat:
1. App icon niet correct is geconfigureerd in `Info.plist`
2. App icon bestanden ontbreken of zijn beschadigd
3. Xcode project settings zijn niet correct
4. Capacitor sync is niet uitgevoerd

## Oplossing

### Stap 1: Automatische Fix (Aanbevolen)

#### Op Mac:
```bash
chmod +x scripts/fix-ios-app-icon.sh
./scripts/fix-ios-app-icon.sh
```

### Stap 2: Handmatige Fix

#### 2.1 Controleer app icon structuur
```
ios/App/App/Assets.xcassets/
├── AppIcon.appiconset/
│   ├── AppIcon-512@2x.png  ← Moet 1024x1024 pixels zijn
│   └── Contents.json
└── Contents.json
```

#### 2.2 Controleer Info.plist configuratie
De `Info.plist` moet deze configuratie bevatten:
```xml
<key>CFBundleIcons</key>
<dict>
    <key>CFBundlePrimaryIcon</key>
    <dict>
        <key>CFBundleIconName</key>
        <string>AppIcon</string>
        <key>CFBundleIconFiles</key>
        <array>
            <string>AppIcon</string>
        </array>
    </dict>
</dict>
```

#### 2.3 Xcode project settings
1. Open `ios/App/App.xcworkspace`
2. Selecteer App target
3. Ga naar General tab
4. Scroll naar "App Icons and Launch Images"
5. Zorg dat "App Icons Source" op `AppIcon` staat

## App Icon Vereisten

### Voor App Store
- **1024x1024 pixels** (AppIcon-512@2x.png)
- **PNG formaat**
- **Geen transparantie**
- **Geen afgeronde hoeken** (Apple voegt deze toe)

### Voor Development
- **1024x1024 pixels** is voldoende
- Xcode genereert automatisch andere formaten

## Troubleshooting

### Probleem 1: App icon bestand ontbreekt
```bash
# Controleer of bestand bestaat
ls -la ios/App/App/Assets.xcassets/AppIcon.appiconset/

# Als het ontbreekt, kopieer van root directory
cp rijflow_icon_1024.png ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
```

### Probleem 2: Verkeerde bestandsgrootte
```bash
# Controleer afbeelding grootte
file ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png

# Moet 1024x1024 pixels zijn
```

### Probleem 3: Xcode herkent app icon niet
1. Sluit Xcode
2. Verwijder derived data:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
3. Open Xcode opnieuw
4. Open `.xcworkspace` bestand
5. Clean Build Folder

### Probleem 4: Capacitor sync problemen
```bash
# Sync Capacitor opnieuw
npx cap sync ios

# Controleer of app icon behouden blijft
ls -la ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

## Veelvoorkomende Fouten

### ❌ Fout: App icon niet gevonden
```
Error: None of the input catalogs contained a matching app icon set named "AppIcon"
```
**Oplossing**: Controleer Info.plist configuratie en app icon bestand

### ❌ Fout: Verkeerde bestandsgrootte
```
Error: App icon must be 1024x1024 pixels
```
**Oplossing**: Gebruik correcte afbeelding grootte

### ❌ Fout: Transparantie in app icon
```
Error: App icon contains transparency
```
**Oplossing**: Verwijder transparantie uit afbeelding

## Best Practices

### 1. App icon voorbereiden
```bash
# Gebruik een 1024x1024 PNG zonder transparantie
# Plaats in: ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
```

### 2. Info.plist configuratie
```xml
<!-- Zorg dat deze configuratie aanwezig is -->
<key>CFBundleIcons</key>
<dict>
    <key>CFBundlePrimaryIcon</key>
    <dict>
        <key>CFBundleIconName</key>
        <string>AppIcon</string>
    </dict>
</dict>
```

### 3. Xcode project settings
- App Icons Source: `AppIcon`
- Launch Screen File: `LaunchScreen`
- Launch Images Source: `LaunchImage` (optioneel)

### 4. Na Capacitor sync
```bash
npx cap sync ios
# Controleer of app icon behouden blijft
# Open Xcode en clean build folder
```

## Automatisering

### Scripts gebruiken
```bash
# Mac fix
./scripts/fix-ios-app-icon.sh
```

### CI/CD integratie
```yaml
# Voor GitHub Actions
- name: Fix App Icon
  run: |
    # Zorg dat app icon correct is geconfigureerd
    # Voeg Info.plist configuratie toe indien nodig
```

## App Icon Generatie

### Online tools
- [App Icon Generator](https://appicon.co/)
- [MakeAppIcon](https://makeappicon.com/)

### Command line tools
```bash
# Met ImageMagick
convert icon.png -resize 1024x1024 AppIcon-512@2x.png

# Met sips (macOS)
sips -z 1024 1024 icon.png --out AppIcon-512@2x.png
```

## Support

### Apple Developer Documentation
- [App Icons](https://developer.apple.com/design/human-interface-guidelines/ios/icons-and-images/app-icon/)

### Capacitor Documentation
- [iOS Configuration](https://capacitorjs.com/docs/ios/configuration)

## Checklist

- [ ] AppIcon.appiconset directory bestaat
- [ ] AppIcon-512@2x.png (1024x1024) aanwezig
- [ ] Info.plist CFBundleIcons configuratie correct
- [ ] Xcode project settings correct
- [ ] Capacitor gesynchroniseerd
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

### Correcte Info.plist configuratie
```xml
<key>CFBundleIcons</key>
<dict>
    <key>CFBundlePrimaryIcon</key>
    <dict>
        <key>CFBundleIconName</key>
        <string>AppIcon</string>
        <key>CFBundleIconFiles</key>
        <array>
            <string>AppIcon</string>
        </array>
    </dict>
</dict>
``` 