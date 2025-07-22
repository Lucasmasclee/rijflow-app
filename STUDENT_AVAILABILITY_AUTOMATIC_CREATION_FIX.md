# Student Availability Automatic Creation Fix

## 🎯 Probleem
Wanneer een instructeur in de AI-schedule pagina een week selecteert en op "volgende" klikt, krijgen ze een foutmelding omdat er geen `student_availability` records bestaan voor hun studenten voor die week.

## 🔧 Oplossing

### Stap 1: Database RLS Policies Repareren

Voer het volgende SQL script uit in je Supabase SQL editor:

```sql
-- Voer dit uit in Supabase SQL Editor
-- fix-student-availability-rls-final.sql
```

Dit script:
- Repareert de RLS policies voor de `student_availability` tabel
- Zorgt ervoor dat instructeurs availability records kunnen aanmaken voor hun studenten
- Verwijdert conflicterende policies

### Stap 2: Nieuwe API Route

Er is een nieuwe API route toegevoegd: `/api/ai-schedule/create-student-availability`

Deze route:
- Controleert welke studenten geen availability records hebben voor de geselecteerde week
- Maakt automatisch records aan met standaard beschikbaarheid
- Gebruikt standaard beschikbaarheid als deze bestaat, anders standaard waarden

### Stap 3: Frontend Aanpassingen

De AI-schedule pagina is aangepast om:
- Automatisch student availability records aan te maken wanneer een week wordt geselecteerd
- De nieuwe API aan te roepen wanneer op "volgende" wordt geklikt
- Feedback te geven aan de gebruiker over het aantal aangemaakte records

## 🚀 Hoe het werkt

### Automatische Creatie Flow

1. **Week Selectie**: Wanneer een instructeur een week selecteert
2. **Data Loading**: De `loadWeekData` functie wordt aangeroepen
3. **Automatische Creatie**: De `ensureStudentAvailability` functie wordt uitgevoerd
4. **API Call**: Er wordt een POST request gestuurd naar `/api/ai-schedule/create-student-availability`
5. **Database Check**: De API controleert welke studenten geen availability records hebben
6. **Record Creatie**: Voor ontbrekende studenten worden records aangemaakt met standaard beschikbaarheid
7. **Feedback**: De gebruiker krijgt een melding over het aantal aangemaakte records

### Standaard Beschikbaarheid

De automatische creatie gebruikt:
- **Standaard beschikbaarheid** van de instructeur (als deze bestaat)
- **Fallback waarden** als er geen standaard beschikbaarheid is:
  ```json
  {
    "maandag": ["09:00", "17:00"],
    "dinsdag": ["09:00", "17:00"],
    "woensdag": ["09:00", "17:00"],
    "donderdag": ["09:00", "17:00"],
    "vrijdag": ["09:00", "17:00"]
  }
  ```

## 📁 Bestanden die zijn aangepast

### Nieuwe Bestanden
- `src/app/api/ai-schedule/create-student-availability/route.ts` - Nieuwe API route
- `fix-student-availability-rls-final.sql` - RLS policy reparatie script
- `test-student-availability-automatic-creation.sql` - Test script

### Aangepaste Bestanden
- `src/app/dashboard/ai-schedule/page.tsx` - Frontend logica toegevoegd

## 🧪 Testen

### 1. Database Test
Voer het test script uit om te controleren of alles correct is ingesteld:

```sql
-- Voer dit uit in Supabase SQL Editor
-- test-student-availability-automatic-creation.sql
```

### 2. Browser Test
1. Log in als instructeur
2. Ga naar de AI-schedule pagina
3. Selecteer een week
4. Klik op "volgende"
5. Controleer of er geen errors zijn in de browser console
6. Controleer of er een succesmelding verschijnt over aangemaakte records

### 3. Database Verificatie
Controleer of er nieuwe records zijn aangemaakt:

```sql
-- Controleer nieuwe student availability records
SELECT 
    sa.student_id,
    s.first_name || ' ' || s.last_name as student_name,
    sa.week_start,
    sa.availability_data
FROM student_availability sa
JOIN students s ON sa.student_id = s.id
WHERE sa.week_start = '2025-08-03'  -- Vervang met de geselecteerde week
ORDER BY s.first_name;
```

## 🔍 Debugging

### Console Logs
De volgende logs verschijnen in de browser console:
- `Ensuring student availability for week: 2025-08-03`
- `Student availability creation result: {success: true, createdRecords: 1, ...}`
- `Debug student availability result: {weekStart: '2025-08-03', ...}`

### API Responses
De API geeft de volgende responses:
- **Success**: `{success: true, createdRecords: 1, message: "Successfully created availability records for 1 students"}`
- **Error**: `{error: "Failed to create student availability records: ..."}`

## 🛠️ Troubleshooting

### Probleem: 403 Forbidden Error
**Oplossing**: Voer het RLS policy script uit

### Probleem: Geen records aangemaakt
**Controleer**:
1. Of de instructeur studenten heeft
2. Of de RLS policies correct zijn ingesteld
3. Of er geen database errors zijn

### Probleem: Verkeerde standaard beschikbaarheid
**Oplossing**: Stel standaard beschikbaarheid in via de schedule-settings pagina

## 📝 Belangrijke Notities

1. **RLS Policies**: Zorg ervoor dat de RLS policies correct zijn ingesteld
2. **Standaard Beschikbaarheid**: Het is aan te raden om standaard beschikbaarheid in te stellen
3. **Performance**: De automatische creatie gebeurt alleen wanneer nodig
4. **Error Handling**: Er zijn uitgebreide error handling en logging toegevoegd

## ✅ Volgende Stappen

1. Voer het RLS policy script uit in Supabase
2. Test de functionaliteit in de browser
3. Controleer of er geen errors meer zijn
4. Stel eventueel standaard beschikbaarheid in voor betere gebruikerservaring 