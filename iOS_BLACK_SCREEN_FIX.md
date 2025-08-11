# iOS Zwart Scherm Probleem - Oplossing

## Probleem
De RijFlow app toont een zwart scherm op iPhone terwijl de website wel werkt op Safari en de Android app normaal functioneert.

## Oorzaken
1. **WebDir configuratie**: De `.next` directory werkt niet goed met iOS
2. **Static export ontbreekt**: iOS heeft een statische build nodig
3. **iOS-specifieke configuratie**: Ontbrekende iOS instellingen
4. **AppDelegate configuratie**: Incorrecte window initialisatie

## Oplossingen toegepast

### 1. Capacitor Configuratie (capacitor.config.ts)
- `webDir` gewijzigd van `.next` naar `out`
- iOS-specifieke instellingen toegevoegd
- Background color ingesteld op wit

### 2. Next.js Configuratie (next.config.ts)
- `output: 'export'` toegevoegd voor static export
- `trailingSlash: true` voor betere iOS compatibiliteit
- `images: { unoptimized: true }` voor static export

### 3. Package.json Scripts
- `build:static` script toegevoegd
- `ios:build` script toegevoegd
- `ios:open` script toegevoegd

### 4. iOS AppDelegate (AppDelegate.swift)
- Window configuratie verbeterd
- Background color ingesteld op wit
- Root view controller correct ingesteld

### 5. iOS Info.plist
- Status bar instellingen toegevoegd
- Background modes uitgeschakeld
- Full screen mode uitgeschakeld

## Build Stappen

### Op Windows (voorbereiding):
```bash
npm run ios:build
```

### Op Mac (afmaken):
```bash
chmod +x scripts/build-ios.sh
./scripts/build-ios.sh
```

### Handmatig:
```bash
npm run build:static
npx cap sync ios
npx cap open ios
```

## Xcode Instellingen

1. **Team**: Selecteer je Apple Developer Account
2. **Bundle Identifier**: `com.mascelli.rijlesplanner`
3. **Version**: `2.0.1`
4. **Build**: `3`
5. **Background Modes**: Uitgeschakeld
6. **Status Bar Style**: Default
7. **Launch Screen**: Controleer of deze correct is ingesteld

## Troubleshooting

### Als het probleem blijft bestaan:

1. **Clean build**:
   ```bash
   npx cap clean ios
   npm run build:static
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
- Controleer of de `out` directory correct wordt gegenereerd

## Belangrijke Notities

- **iOS builds moeten op macOS worden uitgevoerd**
- **Gebruik altijd `npm run build:static` voor iOS**
- **De `out` directory moet bestaan voordat je `npx cap sync ios` uitvoert**
- **Controleer altijd de Xcode console voor foutmeldingen**

## Contact

Als het probleem blijft bestaan na het volgen van deze instructies, controleer dan:
1. Xcode console output
2. Capacitor versies
3. iOS versie van je testapparaat
4. Of alle bestanden correct zijn gesynchroniseerd 