# iOS Capacitor "No such module 'Capacitor'" Fix

## Probleem
Je krijgt in Xcode de error: `App/App/AppDelegate No such module 'Capacitor'`

## Oorzaak
Dit gebeurt meestal omdat:
1. CocoaPods dependencies niet correct zijn geïnstalleerd
2. Je gebruikt het verkeerde project bestand (.xcodeproj in plaats van .xcworkspace)
3. Xcode cache is verouderd
4. Capacitor sync is niet correct uitgevoerd

## Oplossing

### Stap 1: Automatische Fix (Aanbevolen)

#### Op Mac:
```bash
chmod +x scripts/fix-ios-capacitor.sh
./scripts/fix-ios-capacitor.sh
```

#### Op Windows (voorbereiding):
```bash
scripts/fix-ios-capacitor.bat
```
Daarna kopieer naar Mac en run het Mac script.

### Stap 2: Handmatige Fix

#### 2.1 CocoaPods dependencies opnieuw installeren
```bash
cd ios/App
rm -rf Pods
rm -rf Podfile.lock
pod install
```

#### 2.2 Capacitor synchroniseren
```bash
cd ../..
npx cap sync ios
```

#### 2.3 Xcode cache opruimen
1. Sluit Xcode volledig
2. Open Xcode opnieuw
3. **BELANGRIJK**: Open het `.xcworkspace` bestand, NIET `.xcodeproj`
4. Product → Clean Build Folder
5. Build de app opnieuw

## Belangrijke Punten

### ✅ Gebruik altijd .xcworkspace
- **GOED**: `ios/App/App.xcworkspace`
- **FOUT**: `ios/App/App.xcodeproj`

### ✅ Project structuur
```
ios/
├── App/
│   ├── App.xcworkspace  ← Gebruik dit
│   ├── App.xcodeproj    ← Niet dit
│   ├── Podfile
│   ├── Pods/           ← Wordt gegenereerd door CocoaPods
│   └── App/
│       └── AppDelegate.swift
```

## Troubleshooting

### Probleem 1: "pod command not found"
```bash
# Installeer CocoaPods
sudo gem install cocoapods
```

### Probleem 2: "Permission denied" bij pod install
```bash
# Fix permissions
sudo chown -R $(whoami) ios/App
cd ios/App
pod install
```

### Probleem 3: Xcode toont nog steeds errors
1. Sluit Xcode volledig
2. Verwijder derived data:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
3. Open Xcode opnieuw
4. Open `.xcworkspace` bestand
5. Product → Clean Build Folder

### Probleem 4: Capacitor sync faalt
```bash
# Controleer Capacitor versie
npx cap --version

# Update Capacitor
npm update @capacitor/core @capacitor/ios

# Sync opnieuw
npx cap sync ios
```

## Veelvoorkomende Fouten

### ❌ Fout: .xcodeproj gebruiken
```
Error: No such module 'Capacitor'
```
**Oplossing**: Gebruik `.xcworkspace` bestand

### ❌ Fout: Verouderde Pods
```
Error: Module not found
```
**Oplossing**: Run `pod install` opnieuw

### ❌ Fout: Xcode cache
```
Error: Build failed
```
**Oplossing**: Clean Build Folder

## Best Practices

### 1. Altijd .xcworkspace gebruiken
```bash
# Open het juiste bestand
open ios/App/App.xcworkspace
```

### 2. Na elke Capacitor sync
```bash
npx cap sync ios
# Open Xcode en clean build folder
```

### 3. Bij nieuwe plugins
```bash
npm install @capacitor/plugin-name
npx cap sync ios
# Open Xcode en clean build folder
```

### 4. Regelmatig onderhoud
```bash
# Update dependencies
npm update

# Sync Capacitor
npx cap sync ios

# Reinstall Pods
cd ios/App
pod install
```

## Automatisering

### Scripts gebruiken
```bash
# Mac fix
./scripts/fix-ios-capacitor.sh

# Windows voorbereiding
scripts/fix-ios-capacitor.bat
```

### CI/CD integratie
```yaml
# Voor GitHub Actions
- name: Install CocoaPods
  run: |
    cd ios/App
    pod install
```

## Support

### Apple Developer Forums
- [Capacitor iOS Issues](https://developer.apple.com/forums/tags/capacitor)

### Capacitor Documentation
- [iOS Setup](https://capacitorjs.com/docs/ios)

### CocoaPods Documentation
- [Getting Started](https://guides.cocoapods.org/using/getting-started.html)

## Checklist

- [ ] CocoaPods geïnstalleerd
- [ ] Pods opnieuw geïnstalleerd
- [ ] Capacitor gesynchroniseerd
- [ ] .xcworkspace bestand gebruikt
- [ ] Xcode cache opgeruimd
- [ ] Build succesvol

## Timeline

1. **Diagnose**: 5 minuten
2. **Fix uitvoeren**: 10-15 minuten
3. **Testen**: 5 minuten

**Totaal**: 20-25 minuten 