# iOS Zwart Scherm Probleem - Oplossing

## Probleem
De RijFlow app toont een zwart scherm op iPhone terwijl de website wel werkt op Safari en de Android app normaal functioneert.

## Oorzaken
1. **TypeScript copy probleem**: Capacitor kopieert TypeScript bestanden die niet correct zijn gecompileerd
2. **Storyboard identifier mismatch**: De AppDelegate probeerde handmatig een view controller te laden
3. **Capacitor configuratie conflicten**: Onjuiste webDir en iOS instellingen
4. **iOS build cache problemen**: Oude build bestanden veroorzaken conflicten

## Oplossingen toegepast

### 1. TypeScript Copy Probleem Opgelost
- **Hoofdoorzaak**: Capacitor kopieert `.ts` en `.tsx` bestanden naar iOS project
- **Foutmelding**: `Cannot find module '../../../../../../src/app/api/.../route.js'`
- **Oplossing**: TypeScript bestanden handmatig verwijderen uit iOS project

### 2. AppDelegate Vereenvoudigd (AppDelegate.swift)
- Handmatige storyboard loading verwijderd
- Terug naar standaard Capacitor initialisatie
- Dit voorkomt de NSInvalidArgumentException

### 3. Capacitor Configuratie (capacitor.config.ts)
- `webDir` terug naar `.next` (werkt beter met bestaande iOS build)
- iOS-specifieke instellingen behouden
- Background color en andere optimalisaties

### 4. Next.js Configuratie (next.config.ts)
- Static export verwijderd (niet nodig met .next directory)
- Terug naar standaard Next.js configuratie
- Behoud van PWA functionaliteit

### 5. iOS Info.plist
- Launch screen configuratie geoptimaliseerd
- Status bar instellingen toegevoegd
- Background modes uitgeschakeld

### 6. Nieuwe Fix Scripts
- `fix-capacitor-build.sh` - Mac script voor TypeScript copy probleem
- `fix-capacitor-build.bat` - Windows script voor voorbereiding
- `complete-ios-fix.sh` - Mac script voor complete reset
- `debug-ios.sh` - Mac script voor diagnose

## Build Stappen

### Op Windows (voorbereiding):
```bash
npm run fix-capacitor-build
```

### Op Mac (afmaken):
```bash
chmod +x scripts/fix-capacitor-build.sh
./scripts/fix-capacitor-build.sh
```

### Handmatig:
```bash
# Verwijder iOS build bestanden
rm -rf ios/App/build
rm -rf ios/App/DerivedData
rm -rf ios/App/Pods
rm -rf ios/App/Podfile.lock

npm run build
npx cap sync ios

# Verwijder TypeScript bestanden uit iOS project
find ios/App/App -name "*.ts" -type f -delete
find ios/App/App -name "*.tsx" -type f -delete
find ios/App/App -name "*.map" -type f -delete

npx cap open ios
```

## Xcode Instellingen

1. **Team**: Selecteer je Apple Developer Account
2. **Bundle Identifier**: `com.mascelli.rijlesplanner`
3. **Version**: `2.0.1`
4. **Build**: `3`
5. **Clean Build**: Product → Clean Build Folder
6. **Build**: Product → Build

## Troubleshooting

### Als het probleem blijft bestaan:

1. **TypeScript bestanden verwijderen**:
   ```bash
   # Verwijder alle TypeScript bestanden uit iOS project
   find ios/App/App -name "*.ts" -type f -delete
   find ios/App/App -name "*.tsx" -type f -delete
   find ios/App/App -name "*.map" -type f -delete
   ```

2. **Clean Capacitor build**:
   ```bash
   # Verwijder iOS build bestanden handmatig
   rm -rf ios/App/build
   rm -rf ios/App/DerivedData
   rm -rf ios/App/Pods
   rm -rf ios/App/Podfile.lock
   
   npm run build
   npx cap sync ios
   ```

3. **Xcode clean**:
   - Product → Clean Build Folder
   - Product → Build

4. **Simulator reset**:
   - iOS Simulator → Device → Erase All Content and Settings

5. **Capacitor update**:
   ```bash
   npm update @capacitor/ios @capacitor/core
   npx cap sync ios
   ```

### Debug informatie:
- Controleer Xcode console voor foutmeldingen
- Gebruik Safari Web Inspector op iOS Simulator
- Controleer of de `.next` directory correct wordt gegenereerd
- **Controleer of er TypeScript bestanden in het iOS project staan**

## Belangrijke Notities

- **iOS builds moeten op macOS worden uitgevoerd**
- **Gebruik altijd `npm run build` voor iOS (geen static export)**
- **Verwijder handmatig iOS build bestanden bij problemen (Capacitor 7.4.2 heeft geen 'clean' commando)**
- **Controleer altijd de Xcode console voor foutmeldingen**
- **TypeScript bestanden moeten worden verwijderd uit iOS project na `npx cap sync ios`**

## Contact

Als het probleem blijft bestaan na het volgen van deze instructies, controleer dan:
1. Xcode console output
2. Capacitor versies
3. iOS versie van je testapparaat
4. Of alle bestanden correct zijn gesynchroniseerd
5. **Of er nog TypeScript bestanden in het iOS project staan** 