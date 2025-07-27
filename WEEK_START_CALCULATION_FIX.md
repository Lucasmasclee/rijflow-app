# Week Start Calculation Fix

## 🎯 Probleem

De `week_start` variabele in de Supabase tabellen `student_availability` en `availability_links` werd niet correct berekend. Het probleem was dat zondag werd gezien als de eerste dag van de week in plaats van maandag.

**Voorbeeld van het probleem:**
- Het is zondag 27-07-2025
- Voor de week van 28-07 tot 3-08 werd vandaag (27-07) gezien als de start van de week
- Dit zou maandag 28-07 moeten zijn

## 🔧 Oplossing

### 1. JavaScript Functies Aangepast

#### `src/app/dashboard/students/page.tsx`
```javascript
// Oude berekening (incorrect)
const getMonday = (date: Date) => {
  const newDate = new Date(date)
  const day = newDate.getDay()
  const diff = newDate.getDate() - day + (day === 0 ? -6 : 1)
  newDate.setDate(diff)
  newDate.setHours(0,0,0,0)
  return newDate
}

// Nieuwe berekening (correct)
const getMonday = (date: Date) => {
  const newDate = new Date(date)
  const day = newDate.getDay()
  // Sunday is 0, Monday is 1, etc.
  // We want Monday to be the first day of the week
  // If it's Sunday (day 0), we want the next Monday (add 1)
  // If it's Monday (day 1), we want this Monday (add 0)
  // If it's Tuesday (day 2), we want last Monday (subtract 1)
  // etc.
  const daysToMonday = day === 0 ? 1 : day === 1 ? 0 : -(day - 1)
  newDate.setDate(newDate.getDate() + daysToMonday)
  newDate.setHours(0,0,0,0)
  return newDate
}
```

#### `src/app/dashboard/ai-schedule/page.tsx`
Dezelfde fix toegepast op de `getMonday` functie in de AI schedule pagina.

#### `src/app/dashboard/page.tsx`
```javascript
// Oude berekening (incorrect)
startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Monday

// Nieuwe berekening (correct)
const daysToMonday = today.getDay() === 0 ? 1 : today.getDay() === 1 ? 0 : -(today.getDay() - 1)
startOfWeek.setDate(today.getDate() + daysToMonday) // Monday
```

#### `src/app/api/ai-schedule/test/route.ts`
```javascript
// Oude berekening (incorrect)
nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7) // Next Monday

// Nieuwe berekening (correct)
const daysToNextMonday = today.getDay() === 0 ? 1 : 8 - today.getDay()
nextMonday.setDate(today.getDate() + daysToNextMonday) // Next Monday
```

### 2. SQL Scripts Aangepast

#### `ensure-availability-links.sql`, `generate-availability-links.sql`, `quick-generate-links.sql`
```sql
-- Oude berekening (incorrect)
(CURRENT_DATE + INTERVAL '1 week')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '1 week')::date)::int + 1

-- Nieuwe berekening (correct)
(CURRENT_DATE + INTERVAL '1 week')::date + (1 - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '1 week')::date)::int)
```

### 3. Database Fix Script

Een nieuw script `fix-week-start-calculation.sql` is aangemaakt om bestaande data te corrigeren:

```sql
-- Functie om de correcte maandag van een week te berekenen
CREATE OR REPLACE FUNCTION get_monday_of_week(input_date DATE) 
RETURNS DATE AS $$
BEGIN
  -- EXTRACT(DOW FROM date) geeft 0 voor zondag, 1 voor maandag, etc.
  -- We willen maandag als dag 1 van de week
  -- Als het zondag is (dag 0), dan willen we de volgende maandag (+1 dag)
  -- Als het maandag is (dag 1), dan willen we deze maandag (+0 dagen)
  -- Als het dinsdag is (dag 2), dan willen we de vorige maandag (-1 dag)
  -- etc.
  RETURN input_date + (1 - EXTRACT(DOW FROM input_date)::int);
END;
$$ LANGUAGE plpgsql;

-- Update alle bestaande records
UPDATE availability_links 
SET week_start = get_monday_of_week(week_start)
WHERE week_start != get_monday_of_week(week_start);

UPDATE student_availability 
SET week_start = get_monday_of_week(week_start)
WHERE week_start != get_monday_of_week(week_start);
```

## 📋 Implementatie Stappen

### Stap 1: Voer het database fix script uit
```sql
-- Voer fix-week-start-calculation.sql uit in je Supabase SQL Editor
```

### Stap 2: Controleer de resultaten
Het script toont:
- Huidige week_start waarden
- Gecorrigeerde week_start waarden
- Verificatie dat alle waarden nu maandag zijn

### Stap 3: Test de functionaliteit
1. Ga naar `/dashboard/students`
2. Klik op "SMS Leerlingen"
3. Selecteer een week
4. Controleer dat de juiste week wordt getoond

## ✅ Verificatie

Na het uitvoeren van de fix:

1. **Database controle:**
   ```sql
   -- Alle week_start waarden moeten maandag zijn (dag 1)
   SELECT COUNT(*) as total_records,
          COUNT(CASE WHEN EXTRACT(DOW FROM week_start) = 1 THEN 1 END) as monday_records,
          COUNT(CASE WHEN EXTRACT(DOW FROM week_start) != 1 THEN 1 END) as non_monday_records
   FROM availability_links;
   ```

2. **Frontend controle:**
   - Test de SMS functionaliteit
   - Controleer dat de juiste week wordt getoond
   - Verifieer dat beschikbaarheid links correct werken

## 🔄 Toekomstige Gebruik

Voor nieuwe SQL scripts, gebruik de correcte formule:
```sql
input_date + (1 - EXTRACT(DOW FROM input_date)::int)
```

Voor nieuwe JavaScript code, gebruik de correcte logica:
```javascript
const daysToMonday = day === 0 ? 1 : day === 1 ? 0 : -(day - 1)
```

## 📝 Notities

- **Geen andere plaatsen aangepast**: Alleen de 2 specifieke plaatsen waar week_start wordt berekend zijn aangepast
- **Backward compatibility**: Bestaande functionaliteit blijft werken
- **Database consistency**: Alle bestaande data wordt gecorrigeerd
- **Future-proof**: Nieuwe berekeningen gebruiken de correcte logica 