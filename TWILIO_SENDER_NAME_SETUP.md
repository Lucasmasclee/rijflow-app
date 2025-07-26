# Twilio Custom Sender Name Setup

## 🎯 Overzicht

Dit document legt uit hoe je een custom naam kunt instellen voor je Twilio SMS berichten in plaats van het telefoonnummer te tonen.

## 📱 Opties voor Custom Sender Name

### Optie 1: Alphanumeric Sender ID (Aanbevolen)

**Voordelen:**
- Toont een herkenbare naam (bijv. "RijFlow" of "RijlesApp")
- Professionele uitstraling
- Geen telefoonnummer zichtbaar voor ontvangers

**Nadelen:**
- Niet alle landen ondersteunen alphanumeric sender IDs
- Kan duurder zijn dan gewone SMS
- Vereist goedkeuring van Twilio

### Optie 2: Verified Sender ID

**Voordelen:**
- Toont je eigen telefoonnummer als naam
- Werkt wereldwijd
- Geen extra kosten

**Nadelen:**
- Vereist verificatie van je telefoonnummer
- Toont nog steeds een nummer (maar wel jouw eigen nummer)

## 🔧 Implementatie

### Stap 1: Environment Variables Toevoegen

Voeg de volgende variabelen toe aan je `.env.local`:

```env
# Custom sender name voor SMS berichten
TWILIO_SENDER_NAME=RijFlow

# Messaging Service SID (vind je in Twilio Console)
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Mogelijke waarden:**
- `RijFlow` - Jouw rijschool naam
- `RijlesApp` - App-specifieke naam
- `Rijles` - Korte, duidelijke naam
- `[JouwRijschoolNaam]` - Je eigen rijschool naam

### Stap 2: Messaging Service SID Ophalen

1. **Log in** op je [Twilio Console](https://console.twilio.com/)
2. **Ga naar** Messaging → Services
3. **Klik op** je "RijFlow" service
4. **Kopieer** de Messaging Service SID (begint met "MG")
5. **Voeg toe** aan je `.env.local` als `TWILIO_MESSAGING_SERVICE_SID`

### Stap 3: Sender Pool Instellingen

1. **Ga naar** Messaging → Settings → Sender Pool
2. **Controleer** of je "RijFlow" Alpha Sender ID er staat
3. **Als niet goedgekeurd**: Wacht 24-48 uur op goedkeuring
4. **Als goedgekeurd**: Je kunt direct SMS verzenden

### Stap 4: Goedkeuring Proces

**Voor Nederland:**
- Alphanumeric sender IDs worden meestal binnen 24-48 uur goedgekeurd
- Zorg dat de naam relevant is voor je business
- Vermijd generieke termen zoals "INFO" of "SERVICE"

**Alternatief - Verified Sender ID:**
1. Ga naar Messaging → Settings → Sender Pool
2. Klik op "Add New Sender"
3. Kies "Verified Sender ID"
4. Voer je eigen telefoonnummer in
5. Verificeer via SMS code

## 🧪 Testen

### Test 1: Environment Variable

```bash
# Controleer of de variabele correct is ingesteld
echo $TWILIO_SENDER_NAME
```

### Test 2: SMS Verzenden

1. Ga naar je leerlingen overzicht
2. Klik op "SMS Leerlingen"
3. Selecteer een leerling en week
4. Verstuur een test SMS
5. Controleer of de ontvanger "RijFlow" ziet in plaats van een nummer

### Test 3: Fallback Test

Als de alphanumeric sender ID niet werkt, valt het systeem automatisch terug op je originele telefoonnummer.

## 🐛 Troubleshooting

### Probleem: "Invalid Sender ID"

**Oplossing:**
- Controleer of je sender ID is goedgekeurd in Twilio Console
- Wacht 24-48 uur op goedkeuring
- Gebruik een fallback naar je telefoonnummer

### Probleem: SMS wordt niet verzonden

**Oplossing:**
- Controleer je Twilio account status
- Verificeer dat je voldoende credits hebt
- Controleer de Twilio logs voor foutmeldingen

### Probleem: Ontvanger ziet nog steeds nummer

**Oplossing:**
- Sommige telefoons/apps tonen altijd het nummer
- Test op verschillende apparaten
- Controleer of de sender ID correct is ingesteld

## 📋 Code Wijzigingen

De volgende wijzigingen zijn doorgevoerd in `src/app/api/sms/send/route.ts`:

```typescript
// Nieuwe environment variables
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
const senderName = process.env.TWILIO_SENDER_NAME || 'RijFlow'

// Gebruik MessagingServiceSid in plaats van From
body: new URLSearchParams({
  MessagingServiceSid: messagingServiceSid || '',
  To: formattedPhone,
  Body: message,
}),
```

## 🔒 Beveiliging

- **Geen hardcoded waarden**: De sender naam wordt via environment variables ingesteld
- **Fallback mechanisme**: Als TWILIO_SENDER_NAME niet is ingesteld, wordt 'RijFlow' gebruikt
- **Validatie**: Twilio valideert de sender ID voordat berichten worden verzonden

## 💰 Kosten

- **Alphanumeric Sender ID**: Kan duurder zijn dan gewone SMS (afhankelijk van land)
- **Verified Sender ID**: Geen extra kosten
- **Fallback naar telefoonnummer**: Standaard SMS tarieven

## 📞 Support

Als je problemen ondervindt met het instellen van de custom sender naam:

1. Controleer de [Twilio Sender ID documentatie](https://www.twilio.com/docs/messaging/services/sender-pool)
2. Neem contact op met Twilio support
3. Gebruik tijdelijk je originele telefoonnummer als fallback 