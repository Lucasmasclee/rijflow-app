# Standard Availability Implementation

## 🎯 Overzicht

De app is geüpdatet om een `standard_availability` tabel te gebruiken voor de standaard beschikbaarheid van instructeurs. Deze tabel is gekoppeld aan de rooster instellingen pagina en wordt gebruikt als fallback wanneer er geen specifieke week-beschikbaarheid bestaat in de AI schedule pagina.

## 🔄 Belangrijkste Wijzigingen

### 1. Database Structuur

#### Nieuwe Tabel: `standard_availability`
- **Doel**: Standaard beschikbaarheid per instructeur (niet week-specifiek)
- **Structuur**: JSONB met beschikbaarheid per dag
- **Gebruik**: Rooster instellingen pagina

#### Bestaande Tabel: `instructor_availability`
- **Doel**: Week-specifieke beschikbaarheid voor AI planning
- **Structuur**: JSONB met beschikbaarheid per dag + instellingen
- **Gebruik**: AI schedule pagina

### 2. UI Verbeteringen

#### Nieuwe TimeInput Component
- **Locatie**: `src/components/TimeInput.tsx`
- **Functie**: 4 input velden voor uur/minuut starttijd en eindtijd
- **Gebruik**: Consistent in hele app (rooster instellingen + AI schedule)

#### Rooster Instellingen Pagina
- **Gebruikt**: `standard_availability` tabel
- **UI**: Nieuwe TimeInput component
- **Doel**: Configureer standaard beschikbaarheid

#### AI Schedule Pagina
- **Gebruikt**: `instructor_availability` tabel
- **Fallback**: `standard_availability` als geen week-specifieke data bestaat
- **UI**: Nieuwe TimeInput component

## 🗄️ Database Schema

### standard_availability
```sql
CREATE TABLE standard_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  availability_data JSONB NOT NULL DEFAULT '{}', -- { "maandag": ["09:00", "17:00"], ... }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instructor_id)
);
```

### instructor_availability (bestaand)
```sql
CREATE TABLE instructor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL, -- maandag van de week
  availability_data JSONB NOT NULL DEFAULT '{}', -- { "maandag": ["09:00", "17:00"], ... }
  settings JSONB NOT NULL DEFAULT '{}', -- AI instellingen
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instructor_id, week_start)
);
```

## 🚀 Implementatie Stappen

### 1. Database Setup
Voer het SQL script uit:
```bash
# Voer setup-standard-availability.sql uit in Supabase SQL editor
```

### 2. Frontend Updates
- ✅ TimeInput component toegevoegd
- ✅ Rooster instellingen pagina geüpdatet
- ✅ AI schedule pagina geüpdatet
- ✅ Database types geüpdatet

### 3. API Updates
- ✅ `/api/ai-schedule/create-editable-input` gebruikt standard_availability als fallback

## 📱 Gebruikerservaring

### Voor Instructeurs

#### Rooster Instellingen (`/dashboard/schedule-settings`)
1. **Standaard beschikbaarheid instellen**: Configureer je normale werkdagen en tijden
2. **TimeInput component**: 4 kleine input velden voor uur/minuut
3. **Automatisch opslaan**: Data wordt opgeslagen in `standard_availability`

#### AI Schedule (`/dashboard/ai-schedule`)
1. **Week selectie**: Kies een specifieke week voor planning
2. **Automatische fallback**: Als geen week-specifieke data bestaat, wordt standaard beschikbaarheid gebruikt
3. **Week-specifieke aanpassingen**: Pas beschikbaarheid aan voor die specifieke week
4. **Data wordt opgeslagen**: In `instructor_availability` voor die week

### Workflow
1. **Eerst**: Stel standaard beschikbaarheid in via rooster instellingen
2. **Dan**: Ga naar AI schedule en selecteer een week
3. **Automatisch**: Standaard beschikbaarheid wordt geladen
4. **Optioneel**: Pas aan voor die specifieke week
5. **Resultaat**: AI planning met correcte beschikbaarheid

## 🔧 Technische Details

### TimeInput Component
```typescript
interface TimeInputProps {
  startTime: string
  endTime: string
  onTimeChange: (startTime: string, endTime: string) => void
  disabled?: boolean
  className?: string
}
```

### API Fallback Logic
```typescript
// In create-editable-input route
if (!existingAvailability) {
  // Haal standaard beschikbaarheid op
  const { data: standardAvailability } = await supabase
    .from('standard_availability')
    .select('availability_data')
    .eq('instructor_id', instructorId)
    .single()

  // Gebruik standaard beschikbaarheid als fallback
  if (standardAvailability?.availability_data) {
    availabilityData = standardAvailability.availability_data
  }
}
```

## 🧪 Testing

### Test Scenario's
1. **Nieuwe instructeur**: Geen data → standaard waarden
2. **Bestaande instructeur**: Migreer oude data → nieuwe structuur
3. **Week selectie**: Geen week data → gebruik standaard
4. **Week aanpassing**: Pas week-specifieke data aan
5. **UI consistentie**: TimeInput werkt overal hetzelfde

### Database Checks
```sql
-- Controleer standard_availability
SELECT COUNT(*) FROM standard_availability;

-- Controleer instructor_availability
SELECT COUNT(*) FROM instructor_availability;

-- Controleer migratie
SELECT 
  sa.instructor_id,
  sa.availability_data,
  ia.week_start
FROM standard_availability sa
LEFT JOIN instructor_availability ia ON sa.instructor_id = ia.instructor_id
LIMIT 5;
```

## 📋 Bestanden

### Nieuwe Bestanden
- `src/components/TimeInput.tsx` - Herbruikbare tijd input component
- `setup-standard-availability.sql` - Database setup script
- `create-standard-availability-table.sql` - Tabel creatie script

### Geüpdatete Bestanden
- `src/app/dashboard/schedule-settings/page.tsx` - Gebruikt standard_availability
- `src/app/dashboard/ai-schedule/page.tsx` - Gebruikt TimeInput component
- `src/app/api/ai-schedule/create-editable-input/route.ts` - Fallback logic
- `src/types/database.ts` - Nieuwe StandardAvailability interface

## 🎉 Voordelen

1. **Consistente UI**: TimeInput component overal hetzelfde
2. **Betere UX**: Standaard beschikbaarheid als fallback
3. **Flexibiliteit**: Week-specifieke aanpassingen mogelijk
4. **Performance**: JSONB indexes voor snelle queries
5. **Maintainability**: Gescheiden concerns (standaard vs week-specifiek)

## 🔮 Toekomstige Verbeteringen

1. **Bulk editing**: Meerdere dagen tegelijk aanpassen
2. **Templates**: Vooraf gedefinieerde beschikbaarheid templates
3. **Recurring patterns**: Herhalende beschikbaarheid patronen
4. **Import/Export**: Beschikbaarheid importeren/exporteren 