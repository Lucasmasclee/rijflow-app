# App Store Publicatie Handleiding voor RijFlow

## Vereisten

1. **Apple Developer Account** ($99/jaar)
2. **Mac computer** met Xcode geïnstalleerd
3. **App Store Connect** toegang

## Stap 1: Apple Developer Account Setup

1. Ga naar [developer.apple.com](https://developer.apple.com)
2. Log in met je Apple ID
3. Koop een Apple Developer Program membership ($99/jaar)
4. Wacht op goedkeuring (meestal 24-48 uur)

## Stap 2: App Store Connect Setup

1. Ga naar [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Log in met je Apple Developer Account
3. Klik op "My Apps" → "+" → "New App"
4. Vul de app informatie in:
   - **Platform**: iOS
   - **Name**: RijFlow
   - **Primary language**: Dutch
   - **Bundle ID**: com.rijflow.app
   - **SKU**: rijflow-ios-001
   - **User Access**: Full Access

## Stap 3: App Metadata

### App Information
- **Name**: RijFlow
- **Subtitle**: Rijles Planner
- **Description**: 
```
Beheer je planning, leerlingen en administratie op één plek. Werk 30% minder aan administratie en focus op wat echt belangrijk is: je leerlingen.

FUNCTIES:
• Lesplanning met kalender en drag & drop
• Leerlingbeheer en voortgang bijhouden
• Automatische facturatie en rapportage
• Digitale leskaart en communicatie
• Urenregistratie per maand/week
• Overzichtelijke weekplanning

PERFECT VOOR:
• Rijinstructeurs die tijd willen besparen
• Instructeurs die hun administratie willen digitaliseren
• Rijscholen die professioneel willen werken

Start vandaag nog met je gratis proefperiode van 60 dagen!
```

### Keywords
```
rijles,rijschool,instructeur,planning,leerlingen,administratie,facturatie,leskaart,urenregistratie,rijbewijs,autorijles
```

### App Store Categorie
- **Primary Category**: Productivity
- **Secondary Category**: Business

## Stap 4: App Icons & Screenshots

### App Icon Vereisten
- 1024x1024 pixels (PNG)
- Geen transparantie
- Geen afgeronde hoeken (Apple voegt deze toe)

### Screenshots Vereisten
- **iPhone 6.7" Display**: 1290x2796 pixels
- **iPhone 6.5" Display**: 1242x2688 pixels
- **iPhone 5.5" Display**: 1242x2208 pixels
- **iPad Pro 12.9" Display**: 2048x2732 pixels

## Stap 5: Xcode Build & Archive

### Op Mac computer:

1. **Clone repository en installeer dependencies:**
```bash
git clone [your-repo-url]
cd rijflow-app
npm install
```

2. **Build de app:**
```bash
npm run build
npx cap sync
```

3. **Open in Xcode:**
```bash
npx cap open ios
```

4. **Xcode configuratie:**
   - Selecteer je Team (Apple Developer Account)
   - Zet Bundle Identifier op: `com.rijflow.app`
   - Zet Version op: `1.0.0`
   - Zet Build op: `1`

5. **Archive de app:**
   - Product → Archive
   - Wacht tot archivering klaar is
   - Klik op "Distribute App"
   - Selecteer "App Store Connect"
   - Upload naar App Store Connect

## Stap 6: App Store Review

1. **In App Store Connect:**
   - Ga naar je app
   - Klik op "Prepare for Submission"
   - Vul alle metadata in
   - Upload screenshots en app icon
   - Zet app status op "Ready for Review"

2. **Review criteria:**
   - App werkt zonder crashes
   - Alle functionaliteit werkt
   - Privacy policy aanwezig
   - Geen placeholder content

## Stap 7: Privacy & Legal

### Privacy Policy
Maak een privacy policy aan op je website en voeg de URL toe in App Store Connect.

### App Privacy Details
- **Data Used to Track You**: None
- **Data Linked to You**: Email address, User ID
- **Data Not Linked to You**: Analytics

## Stap 8: Pricing & Availability

- **Price**: Free (met in-app purchases voor premium features)
- **Availability**: Netherlands, Belgium
- **Age Rating**: 4+ (geen leeftijdsbeperking)

## Stap 9: Submit for Review

1. Controleer alle informatie
2. Klik op "Submit for Review"
3. Wacht op Apple's review (meestal 1-3 dagen)
4. Je krijgt een email met het resultaat

## Troubleshooting

### Veelvoorkomende problemen:

1. **Build errors**: Controleer Xcode logs
2. **Rejection**: Lees Apple's feedback en pas aan
3. **Metadata issues**: Controleer alle velden
4. **Screenshot issues**: Gebruik juiste formaten

### Support
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)

## Kosten Overzicht

- **Apple Developer Program**: $99/jaar
- **App Store Connect**: Gratis
- **App hosting**: Vercel (gratis tier beschikbaar)
- **Database**: Supabase (gratis tier beschikbaar)

## Timeline

1. **Setup**: 1-2 dagen
2. **Development**: 1-2 weken
3. **Testing**: 1 week
4. **Review**: 1-3 dagen
5. **Publication**: Direct na goedkeuring

**Totaal**: 3-4 weken 