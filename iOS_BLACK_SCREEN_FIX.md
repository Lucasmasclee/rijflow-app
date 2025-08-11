# iOS Zwart Scherm Probleem - Oplossing

## Probleem
De RijFlow app toont een zwart scherm op iPhone terwijl de website wel werkt op Safari en de Android app normaal functioneert.

## Oorzaken
1. **Storyboard identifier mismatch**: De AppDelegate probeerde handmatig een view controller te laden
2. **Capacitor configuratie conflicten**: Onjuiste webDir en iOS instellingen
3. **iOS build cache problemen**: Oude build bestanden veroorzaken conflicten

## Oplossingen toegepast

### 1. AppDelegate Vereenvoudigd (AppDelegate.swift)
- Handmatige storyboard loading verwijderd
- Terug naar standaard Capacitor initialisatie
- Dit voorkomt de NSInvalidArgumentException

### 2. Capacitor Configuratie (capacitor.config.ts)
- `webDir` terug naar `.next` (werkt beter met bestaande iOS build)
- iOS-specifieke instellingen behouden
- Background color en andere optimalisaties

### 3. Next.js Configuratie (next.config.ts)
- Static export verwijderd (niet nodig met .next directory)
- Terug naar standaard Next.js configuratie
- Behoud van PWA functionaliteit

### 4. iOS Info.plist
- Launch screen configuratie geoptimaliseerd
- Status bar instellingen toegevoegd
- Background modes uitgeschakeld

### 5. Nieuwe Fix Scripts
- `fix-ios-capacitor.sh` - Mac script voor clean build
- `fix-ios-capacitor.bat` - Windows script voor voorbereiding

## Build Stappen

### Op Windows (voorbereiding):
```bash
npm run fix-ios-capacitor
```

### Op Mac (afmaken):
```bash
chmod +x scripts/fix-ios-capacitor.sh
./scripts/fix-ios-capacitor.sh
```

### Handmatig:
```bash
npx cap clean ios
npm run build
npx cap sync ios
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

1. **Clean Capacitor build**:
   ```bash
   npx cap clean ios
   npm run build
   npx cap sync ios
   ```

2. **Xcode clean**:
   - Product → Clean Build Folder
   - Product → Build

3. **Simulator reset**:
   - iOS Simulator → Device → Erase All Content and Settings

4. **Capacitor update**:
   ```bash
   npm update @capacitor/ios @capacitor/core
   npx cap sync ios
   ```

### Debug informatie:
- Controleer Xcode console voor foutmeldingen
- Gebruik Safari Web Inspector op iOS Simulator
- Controleer of de `.next` directory correct wordt gegenereerd

## Belangrijke Notities

- **iOS builds moeten op macOS worden uitgevoerd**
- **Gebruik altijd `npm run build` voor iOS (geen static export)**
- **Voer altijd `npx cap clean ios` uit bij problemen**
- **Controleer altijd de Xcode console voor foutmeldingen**

## Contact

Als het probleem blijft bestaan na het volgen van deze instructies, controleer dan:
1. Xcode console output
2. Capacitor versies
3. iOS versie van je testapparaat
4. Of alle bestanden correct zijn gesynchroniseerd 