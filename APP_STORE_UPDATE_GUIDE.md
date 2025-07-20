# RijFlow App Store Update Handleiding

## Overzicht
Deze handleiding helpt je bij het uploaden van een nieuwe versie van RijFlow naar de Apple App Store.

## Vereisten
- ✅ Apple Developer Account ($99/jaar)
- ✅ Mac computer met Xcode
- ✅ App Store Connect toegang
- ✅ RijFlow app al gepubliceerd in App Store

## Stap 1: Versie Nummers Verhogen

### 1.1 Package.json
```json
{
  "version": "1.0.1"  // Verhoog dit nummer
}
```

### 1.2 iOS Info.plist
```xml
<key>CFBundleShortVersionString</key>
<string>1.0.1</string>  <!-- Verhoog dit nummer -->
<key>CFBundleVersion</key>
<string>2</string>      <!-- Verhoog dit nummer -->
```

**Versie nummering uitleg:**
- `CFBundleShortVersionString`: Publieke versie (1.0.0, 1.0.1, 1.1.0, etc.)
- `CFBundleVersion`: Build nummer (moet altijd verhoogd worden)

## Stap 2: Build de App

### Op Windows (voorbereiding):
```bash
scripts/build-ios-release.bat
```

### Op Mac (volledige build):
```bash
chmod +x scripts/build-ios-release.sh
./scripts/build-ios-release.sh
```

## Stap 3: Xcode Archive

1. **Open Xcode project:**
   ```bash
   npx cap open ios
   ```

2. **Controleer instellingen:**
   - Team: Selecteer je Apple Developer Account
   - Bundle Identifier: `com.mascelli.rijlesplanner`
   - Version: `1.0.1` (of je nieuwe versie)
   - Build: `2` (verhoog dit nummer)

3. **Archive de app:**
   - Product → Archive
   - Wacht tot archivering klaar is
   - Klik op "Distribute App"
   - Selecteer "App Store Connect"
   - Upload naar App Store Connect

## Stap 4: App Store Connect

### 4.1 Ga naar App Store Connect
- URL: https://appstoreconnect.apple.com
- Log in met je Apple Developer Account

### 4.2 Selecteer je app
- Klik op "My Apps"
- Zoek en klik op "RijFlow"

### 4.3 Maak nieuwe versie
- Klik op de "+" knop naast "iOS App"
- Selecteer "New Version"
- Vul versie nummer in: `1.0.1`

### 4.4 Upload build
- Ga naar "TestFlight" tab
- Klik op "Builds"
- Wacht tot je nieuwe build verschijnt
- Selecteer de build en klik "Add to TestFlight"

## Stap 5: App Store Metadata

### 5.1 App Information
- **What's New in This Version:**
  ```
  🚀 Nieuwe functies en verbeteringen:
  • Verbeterde AI weekplanning
  • Nieuwe dagoverzicht functionaliteit
  • Bug fixes en performance verbeteringen
  • Verbeterde gebruikerservaring
  ```

### 5.2 Screenshots (indien gewijzigd)
- **iPhone 6.7"**: 1290x2796 pixels
- **iPhone 6.5"**: 1242x2688 pixels
- **iPhone 5.5"**: 1242x2208 pixels

### 5.3 App Review Information
- **Contact Information**: Je contactgegevens
- **Demo Account**: Test account voor reviewers
- **Notes**: Specifieke informatie over nieuwe features

## Stap 6: Submit voor Review

### 6.1 Controleer alles
- ✅ Build geüpload
- ✅ Metadata ingevuld
- ✅ Screenshots geüpload
- ✅ Privacy policy up-to-date

### 6.2 Submit
- Klik op "Save" voor alle wijzigingen
- Klik op "Submit for Review"
- Bevestig de submission

## Stap 7: Review Proces

### 7.1 Review tijd
- **Gemiddeld**: 1-3 dagen
- **Soms**: 24 uur
- **Bij problemen**: 1-2 weken

### 7.2 Status updates
- **Waiting for Review**: App is ingediend
- **In Review**: Apple beoordeelt de app
- **Ready for Sale**: App is goedgekeurd
- **Rejected**: App is afgewezen (met feedback)

## Troubleshooting

### Veelvoorkomende problemen:

#### 1. Build upload problemen
```bash
# Controleer Xcode logs
# Zorg dat je de juiste provisioning profile gebruikt
# Controleer Bundle Identifier
```

#### 2. App Store rejection
- Lees Apple's feedback zorgvuldig
- Los alle genoemde problemen op
- Test de app grondig
- Submit opnieuw

#### 3. Metadata problemen
- Controleer alle verplichte velden
- Zorg dat screenshots correct zijn
- Controleer privacy policy URL

### Veelvoorkomende rejection redenen:
- App crasht tijdens gebruik
- Incomplete functionaliteit
- Placeholder content
- Privacy policy problemen
- Metadata niet correct

## Best Practices

### 1. Versie nummering
- Gebruik semantic versioning (1.0.0, 1.0.1, 1.1.0)
- Verhoog altijd het build nummer
- Documenteer wijzigingen

### 2. Testing
- Test op verschillende iOS versies
- Test alle functionaliteit
- Controleer voor crashes
- Test offline functionaliteit

### 3. Metadata
- Schrijf duidelijke "What's New" tekst
- Gebruik actuele screenshots
- Controleer alle links

## Automatisering Tips

### 1. Scripts gebruiken
```bash
# Windows voorbereiding
scripts/build-ios-release.bat

# Mac build
./scripts/build-ios-release.sh
```

### 2. CI/CD (optioneel)
- GitHub Actions voor automatische builds
- Fastlane voor geautomatiseerde deployment
- TestFlight automatische uploads

## Kosten Overzicht

- **Apple Developer Program**: $99/jaar
- **App Store Connect**: Gratis
- **TestFlight**: Gratis (voor betatesters)

## Timeline

1. **Development**: 1-2 weken
2. **Testing**: 1 week
3. **Build & Upload**: 1 dag
4. **Review**: 1-3 dagen
5. **Publication**: Direct na goedkeuring

**Totaal per update**: 2-4 weken

## Support

- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)

## Checklist voor elke update

- [ ] Versie nummers verhoogd
- [ ] Code getest
- [ ] Build succesvol
- [ ] App Store Connect metadata bijgewerkt
- [ ] Screenshots geüpload (indien gewijzigd)
- [ ] "What's New" tekst geschreven
- [ ] Privacy policy gecontroleerd
- [ ] App gesubmit voor review
- [ ] Review feedback verwerkt (indien afgewezen) 