# SMS Systeem Implementatie

## 🎯 Overzicht

Dit document beschrijft de implementatie van het SMS systeem voor het verzamelen van leerling beschikbaarheid. Het systeem bestaat uit twee hoofdprocessen:

1. **Instructeur Flow**: SMS verzenden naar leerlingen
2. **Leerling Flow**: Beschikbaarheid invullen via persoonlijke link

## 📋 Vereisten

### Environment Variables
Zorg ervoor dat de volgende Twilio variabelen zijn ingesteld in je `.env.local`:

```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=your_twilio_phone_number
```

### Database Setup
Voer de volgende SQL scripts uit in je Supabase SQL Editor:

1. **`add-sms-system-columns.sql`** - Voegt de benodigde kolommen toe aan de students tabel
2. **`add-sms-rls-policies.sql`** - Voegt RLS policies toe voor het SMS systeem

## 🗄️ Database Wijzigingen

### Nieuwe Kolommen in `students` Tabel

```sql
-- public_token: Unieke token voor SMS links
ALTER TABLE students ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;

-- sms_laatst_gestuurd: Timestamp wanneer SMS laatst is gestuurd
ALTER TABLE students ADD COLUMN IF NOT EXISTS sms_laatst_gestuurd TIMESTAMP WITH TIME ZONE;

-- public_url: Volledige URL voor beschikbaarheid formulier
ALTER TABLE students ADD COLUMN IF NOT EXISTS public_url TEXT;
```

### RLS Policies

Het systeem gebruikt de volgende RLS policies:

- **Public token access**: Leerlingen kunnen hun eigen beschikbaarheid beheren via public_token
- **Instructor access**: Instructeurs kunnen beschikbaarheid van hun leerlingen bekijken en beheren

## 🚀 Implementatie Stappen

### Stap 1: Database Setup

1. Voer `add-sms-system-columns.sql` uit in Supabase SQL Editor
2. Voer `add-sms-rls-policies.sql` uit in Supabase SQL Editor
3. Controleer dat alle kolommen en policies correct zijn aangemaakt

### Stap 2: Environment Variables

Controleer dat je Twilio credentials correct zijn ingesteld:

```bash
# Test Twilio configuratie
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
echo $TWILIO_FROM_NUMBER
```

### Stap 3: Code Deployment

De volgende bestanden zijn toegevoegd/aangepast:

#### Nieuwe Bestanden:
- `src/app/api/sms/send/route.ts` - SMS verzend API
- `src/app/api/student-availability/route.ts` - Beschikbaarheid ophaal API
- `src/app/beschikbaarheid/[public_token]/page.tsx` - Leerling beschikbaarheid pagina

#### Aangepaste Bestanden:
- `src/types/database.ts` - TypeScript types uitgebreid
- `src/app/dashboard/students/page.tsx` - SMS functionaliteit toegevoegd
- `src/app/dashboard/students/new/page.tsx` - Automatische public_token generatie

## 🔧 Functionaliteit

### Instructeur Flow

1. **SMS Leerlingen Knop**: Klik op "SMS Leerlingen" in het leerlingoverzicht
2. **Week Selectie**: Kies een week (8 weken in de toekomst beschikbaar)
3. **Leerling Selectie**: 
   - Toggle staat automatisch uit voor leerlingen waarnaar minder dan 6 dagen geleden SMS is gestuurd
   - Ongeldige telefoonnummers worden getoond
   - Selecteer leerlingen met geldige telefoonnummers
4. **SMS Verzenden**: Klik op "SMS Sturen" om berichten te verzenden

### Leerling Flow

1. **SMS Ontvangen**: Leerling krijgt gepersonaliseerd SMS bericht
2. **Link Klikken**: Leerling klikt op persoonlijke link
3. **Beschikbaarheid Invullen**: 
   - Eenvoudige interface met dagen van de week
   - Meerdere tijdsblokken per dag mogelijk
   - Tijden in 30-minuten intervallen
4. **Opslaan**: Beschikbaarheid wordt opgeslagen in database

### SMS Bericht Formaat

```
Beste [LeerlingNaam], vul je beschikbaarheid in voor [WeekStart] - [WeekEnd] met deze link: [PersoonlijkeLink]
```

## 📱 Beschikbaarheid Formaat

De beschikbaarheid wordt opgeslagen in JSONB formaat:

```json
{
  "maandag": ["09:00", "17:00"],
  "dinsdag": ["09:00", "17:00"],
  "woensdag": ["09:00", "17:00"],
  "donderdag": ["09:00", "17:00"],
  "vrijdag": ["09:00", "17:00"],
  "zaterdag": ["09:00", "17:00"],
  "zondag": ["09:00", "17:00"]
}
```

## 🔐 Beveiliging

### RLS Policies

- **Student Access**: Leerlingen kunnen alleen hun eigen beschikbaarheid beheren via public_token
- **Instructor Access**: Instructeurs kunnen beschikbaarheid van hun leerlingen bekijken
- **Public Token Validation**: Public tokens worden gevalideerd bij elke request

### Telefoonnummer Validatie

- Nederlandse mobiele nummers (06-xxxxxxxx)
- Internationale format (+316xxxxxxxx)
- Automatische conversie naar internationaal formaat voor Twilio

## 🧪 Testen

### 1. Database Test

```sql
-- Controleer of kolommen bestaan
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' 
AND column_name IN ('public_token', 'sms_laatst_gestuurd', 'public_url');
```

### 2. SMS Test

1. Maak een test leerling aan
2. Ga naar leerlingen overzicht
3. Klik op "SMS Leerlingen"
4. Selecteer een week en leerling
5. Verstuur test SMS

### 3. Beschikbaarheid Test

1. Open de persoonlijke link van een leerling
2. Vul beschikbaarheid in
3. Controleer of data correct wordt opgeslagen

## 🐛 Troubleshooting

### Veelvoorkomende Problemen

1. **Twilio API Errors**
   - Controleer environment variables
   - Verificeer Twilio account status
   - Controleer telefoonnummer formaat

2. **RLS Policy Errors**
   - Voer RLS policies opnieuw uit
   - Controleer of policies correct zijn aangemaakt

3. **Public Token Issues**
   - Controleer of public_token kolom bestaat
   - Verificeer dat tokens uniek zijn

### Debug Logs

Controleer de browser console en server logs voor:
- Database connection errors
- Twilio API responses
- RLS policy violations

## 📈 Monitoring

### SMS Tracking

- `sms_laatst_gestuurd` timestamp wordt automatisch bijgewerkt
- Instructeurs kunnen zien wanneer laatste SMS is gestuurd
- 6-dagen cooldown periode wordt automatisch toegepast

### Beschikbaarheid Tracking

- Beschikbaarheid wordt opgeslagen per week
- Instructeurs kunnen beschikbaarheid bekijken in AI-schedule
- Data wordt gebruikt voor automatische weekplanning

## 🔄 Integratie met AI-Schedule

De beschikbaarheid data wordt automatisch gebruikt in de AI-schedule functionaliteit:

1. **Data Ophalen**: `/api/student-availability` endpoint
2. **Formaat Conversie**: Automatische conversie naar AI-schedule formaat
3. **Weekplanning**: Beschikbaarheid wordt gebruikt voor automatische planning

## 📞 Support

Voor vragen of problemen:
1. Controleer de logs in Supabase dashboard
2. Verificeer environment variables
3. Test met een eenvoudige leerling setup
4. Controleer Twilio account status en credits 