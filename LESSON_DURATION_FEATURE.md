# Lesduur Functionaliteit

## Overzicht

Deze functionaliteit voegt ondersteuning toe voor het berekenen van het aantal lessen op basis van de werkelijke lesduur en een standaard lesduur die door de instructeur wordt ingesteld.

## Functionaliteit

### 1. Standaard Lesduur Instelling

- Instructeurs kunnen een standaard lesduur instellen in minuten (bijv. 50 minuten)
- Deze instelling wordt opgeslagen in de `standard_availability` tabel
- De standaard lesduur wordt gebruikt om te berekenen hoeveel lessen een les vertegenwoordigt

### 2. Les Berekening

- Een les wordt geteld als meerdere lessen op basis van de werkelijke duur
- Bijvoorbeeld: met een standaard lesduur van 50 minuten:
  - Een les van 09:00-10:00 (60 min) = 1 les
  - Een les van 09:00-10:40 (100 min) = 2 lessen
  - Een les van 09:00-11:30 (150 min) = 3 lessen

### 3. Registratie Flow

- Nieuwe instructeurs worden direct naar de schedule-settings pagina gestuurd
- Ze moeten eerst hun standaard beschikbaarheid en lesduur instellen
- Na het opslaan worden ze doorgestuurd naar het dashboard

## Database Wijzigingen

### Nieuwe Kolom

```sql
-- Voeg default_lesson_duration kolom toe aan standard_availability tabel
ALTER TABLE standard_availability 
ADD COLUMN IF NOT EXISTS default_lesson_duration INTEGER DEFAULT 50;
```

### SQL Script

Het bestand `add-default-lesson-duration.sql` bevat alle benodigde database wijzigingen.

## Code Wijzigingen

### 1. Schedule Settings Pagina (`src/app/dashboard/schedule-settings/page.tsx`)

- Toegevoegd: input veld voor standaard lesduur
- Toegevoegd: opslag van standaard lesduur in database
- Toegevoegd: redirect naar dashboard na opslaan

### 2. Les Utils (`src/lib/lesson-utils.ts`)

- Nieuwe utility functies voor les berekening
- `calculateLessonCount()`: Berekent aantal lessen op basis van duur
- `getDefaultLessonDuration()`: Haalt standaard lesduur op voor instructeur
- `calculateTotalLessonCount()`: Berekent totaal aantal lessen voor meerdere lessen

### 3. Student Overzicht (`src/app/dashboard/students/page.tsx`)

- Aangepast: les telling gebruikt nu de nieuwe berekening
- Toegevoegd: import van lesson-utils functies

### 4. Student Detail (`src/app/dashboard/students/[id]/page.tsx`)

- Aangepast: les telling gebruikt nu de nieuwe berekening
- Toegevoegd: import van lesson-utils functies

### 5. Auth Context (`src/contexts/AuthContext.tsx`)

- Toegevoegd: check voor standaard beschikbaarheid bij login
- Toegevoegd: redirect naar schedule-settings voor nieuwe instructeurs

### 6. Dashboard (`src/app/dashboard/page.tsx`)

- Toegevoegd: check voor instructeur setup
- Toegevoegd: redirect naar schedule-settings indien nodig

### 7. Database Types (`src/types/database.ts`)

- Aangepast: `StandardAvailability` interface bevat nu `default_lesson_duration`

## Testen

### Test Script

Het bestand `test-lesson-duration-calculation.js` bevat test cases voor de les berekening:

```bash
node test-lesson-duration-calculation.js
```

### Test Cases

- Verschillende lesduren met standaard 50 minuten
- Verschillende standaard lesduren (30, 45, 60 minuten)
- Edge cases en validatie

## Gebruik

### Voor Instructeurs

1. **Registratie**: Na registratie worden instructeurs naar schedule-settings gestuurd
2. **Instellingen**: Stel standaard beschikbaarheid en lesduur in
3. **Lesplanning**: Lessen worden automatisch geteld op basis van duur

### Voor Leerlingen

- Het aantal lessen wordt correct getoond in het overzicht
- Langere lessen worden geteld als meerdere lessen
- Dit geeft een accurater beeld van de werkelijke lestijd

## Voorbeelden

### Standaard Lesduur: 50 minuten

| Les Tijd | Duur | Aantal Lessen |
|----------|------|---------------|
| 09:00-10:00 | 60 min | 2 lessen |
| 09:00-10:40 | 100 min | 2 lessen |
| 09:00-11:30 | 150 min | 3 lessen |
| 09:00-09:45 | 45 min | 1 les |
| 09:00-09:55 | 55 min | 1 les |
| 09:00-11:00 | 120 min | 3 lessen |

### Standaard Lesduur: 30 minuten

| Les Tijd | Duur | Aantal Lessen |
|----------|------|---------------|
| 09:00-10:00 | 60 min | 2 lessen |
| 09:00-10:30 | 90 min | 3 lessen |
| 09:00-09:45 | 45 min | 2 lessen |

## Implementatie Details

### Berekening Logica

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

### Database Query

```sql
-- Haal standaard lesduur op voor instructeur
SELECT default_lesson_duration 
FROM standard_availability 
WHERE instructor_id = 'user_id'
```

### Fallback Waarde

Als er geen standaard lesduur is ingesteld, wordt 50 minuten gebruikt als fallback.

## Migratie

Voor bestaande instructeurs:

1. Voer het SQL script uit om de nieuwe kolom toe te voegen
2. Bestaande instructeurs krijgen automatisch 50 minuten als standaard lesduur
3. Ze kunnen dit aanpassen via de schedule-settings pagina

## Toekomstige Verbeteringen

- Mogelijkheid om verschillende lesduren per leerling in te stellen
- Geavanceerdere berekening met pauzes
- Rapportage op basis van werkelijke lestijd
- Integratie met facturering op basis van lestijd 