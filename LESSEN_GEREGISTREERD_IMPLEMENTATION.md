# Lessen Geregistreerd Implementation

## 🎯 Overzicht

Deze implementatie voegt een `lessen_geregistreerd` veld toe aan de `lessons` tabel om het aantal lessen dat een les vertegenwoordigt op te slaan. Dit verbetert de prestaties van de student overzicht en detail pagina's door de berekening op te slaan in plaats van deze elke keer opnieuw uit te voeren.

## ✨ Nieuwe Functionaliteit

### 1. Database Wijzigingen
- **Nieuwe kolom**: `lessen_geregistreerd` toegevoegd aan de `lessons` tabel
- **Automatische berekening**: Het aantal lessen wordt berekend op basis van de lesduur en standaard lesduur
- **Opslag**: De berekende waarde wordt opgeslagen voor snelle toegang

### 2. Verbeterde Prestaties
- **Student overzicht**: Gebruikt opgeslagen waarden in plaats van real-time berekening
- **Student detail**: Snellere laadtijden door gebruik van voorberekende waarden
- **Consistentie**: Alle pagina's gebruiken dezelfde berekende waarden

## 🛠 Technische Implementatie

### Database Schema
```sql
-- Nieuwe kolom toegevoegd aan lessons tabel
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS lessen_geregistreerd INTEGER DEFAULT 1;
```

### Berekening Logica
De `lessen_geregistreerd` waarde wordt berekend met dezelfde logica als de bestaande `calculateLessonCount` functie:

```javascript
function calculateLessonCount(startTime, endTime, defaultLessonDuration) {
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)
  const actualDuration = endMinutes - startMinutes
  
  // Bereken aantal lessen met een marge van 5 minuten
  const baseCount = Math.floor(actualDuration / defaultLessonDuration)
  const remainder = actualDuration % defaultLessonDuration
  
  // Als de rest meer dan 5 minuten is, tel als extra les
  if (remainder > 5) {
    return Math.max(1, baseCount + 1)
  } else {
    return Math.max(1, baseCount)
  }
}
```

### Voorbeelden
Met een standaard lesduur van 50 minuten:
- 09:00-10:00 (60 min) = 1 les
- 09:00-10:40 (100 min) = 2 lessen
- 09:00-11:30 (150 min) = 3 lessen

## 📁 Bestanden Gewijzigd

### 1. Database Scripts
- `add-lessen-geregistreerd-column.sql` - Voegt de nieuwe kolom toe
- `update-existing-lessons-lessen-geregistreerd.sql` - Update bestaande lessen

### 2. TypeScript Types
- `src/types/database.ts` - Toegevoegd `lessen_geregistreerd` aan Lesson interface

### 3. React Components
- `src/app/dashboard/lessons/page.tsx` - Berekent en slaat `lessen_geregistreerd` op bij het opslaan van lessen
- `src/app/dashboard/students/page.tsx` - Gebruikt opgeslagen waarden voor statistieken
- `src/app/dashboard/students/[id]/page.tsx` - Gebruikt opgeslagen waarden voor statistieken
- `src/app/dashboard/day-overview/[date]/page.tsx` - Berekent en slaat `lessen_geregistreerd` op

## 🚀 Implementatie Stappen

### Stap 1: Database Update
Voer het volgende SQL script uit in je Supabase SQL Editor:

```sql
-- Zie add-lessen-geregistreerd-column.sql voor het volledige script
```

### Stap 2: Update Bestaande Lessen
Voer het volgende SQL script uit om bestaande lessen te updaten:

```sql
-- Zie update-existing-lessons-lessen-geregistreerd.sql voor het volledige script
```

### Stap 3: Code Deployment
De TypeScript wijzigingen zijn al geïmplementeerd in de codebase.

## 📊 Voordelen

### 1. Prestatie Verbetering
- **Snellere laadtijden**: Geen real-time berekeningen meer nodig
- **Minder database queries**: Eenvoudige SUM operaties in plaats van complexe berekeningen
- **Betere schaalbaarheid**: Prestaties blijven consistent bij meer lessen

### 2. Consistentie
- **Uniforme berekening**: Alle pagina's gebruiken dezelfde opgeslagen waarden
- **Geen discrepanties**: Geen verschillen tussen verschillende pagina's
- **Betrouwbare statistieken**: Altijd accurate tellingen

### 3. Onderhoud
- **Eenvoudiger debugging**: Berekende waarden zijn zichtbaar in de database
- **Betere monitoring**: Makkelijker om statistieken te controleren
- **Flexibiliteit**: Mogelijkheid om berekeningen aan te passen zonder code wijzigingen

## 🔧 Migratie

### Voor Bestaande Gebruikers
1. **Automatische update**: Bestaande lessen worden automatisch geüpdatet met berekende waarden
2. **Geen data verlies**: Alle bestaande lessen blijven behouden
3. **Backward compatibility**: Oude code blijft werken tijdens de migratie

### Voor Nieuwe Gebruikers
1. **Directe implementatie**: Nieuwe lessen krijgen automatisch de juiste `lessen_geregistreerd` waarde
2. **Geen extra stappen**: Geen handmatige configuratie nodig

## 🧪 Testen

### Database Testen
```sql
-- Controleer of de kolom is toegevoegd
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND column_name = 'lessen_geregistreerd';

-- Controleer berekende waarden
SELECT 
  start_time, 
  end_time, 
  lessen_geregistreerd,
  EXTRACT(EPOCH FROM (end_time - start_time)) / 60 as duration_minutes
FROM lessons 
ORDER BY created_at DESC 
LIMIT 10;
```

### Frontend Testen
1. **Nieuwe les toevoegen**: Controleer of `lessen_geregistreerd` correct wordt berekend
2. **Les bewerken**: Controleer of de waarde wordt geüpdatet
3. **Student statistieken**: Controleer of de tellingen correct zijn
4. **Week kopiëren**: Controleer of `lessen_geregistreerd` wordt meegenomen

## 🔮 Toekomstige Verbeteringen

### 1. Geavanceerde Berekening
- **Per-student instellingen**: Verschillende lesduren per leerling
- **Pauze integratie**: Rekening houden met pauzes tussen lessen
- **Dynamische berekening**: Real-time aanpassing van berekeningen

### 2. Rapportage
- **Gedetailleerde statistieken**: Meer inzicht in lespatronen
- **Export functionaliteit**: Export van lesstatistieken
- **Trend analyse**: Analyse van lespatronen over tijd

### 3. Optimalisatie
- **Caching**: Verdere optimalisatie van database queries
- **Batch updates**: Efficiëntere updates van meerdere lessen
- **Real-time sync**: Automatische synchronisatie van berekeningen

## 📝 Notities

- **Backup**: Maak altijd een backup van je database voordat je de scripts uitvoert
- **Testen**: Test de wijzigingen in een development omgeving eerst
- **Monitoring**: Monitor de prestaties na de implementatie
- **Documentatie**: Update eventuele externe documentatie over de lesberekening 