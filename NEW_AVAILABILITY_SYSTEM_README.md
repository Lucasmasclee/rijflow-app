# Nieuw Beschikbaarheid Systeem voor AI-Weekplanning

## 🎯 Overzicht

Het beschikbaarheid systeem is volledig herstructureerd om AI-weekplanning veel makkelijker te maken. Het nieuwe systeem gebruikt JSONB velden in de database en heeft helper functies voor eenvoudige conversie naar het formaat dat `generate_week_planning.js` verwacht.

## 🔄 Belangrijkste Wijzigingen

### 1. Database Structuur

#### Oude Structuur
- `student_availability`: Tekst veld met JSON string
- `instructor_availability`: Aparte rijen per dag
- Complexe conversie logica in frontend

#### Nieuwe Structuur
- `student_availability`: JSONB veld met directe beschikbaarheid data
- `instructor_availability`: JSONB veld met beschikbaarheid + instellingen
- Helper functies in database voor conversie

### 2. Week-gebaseerde Aanpak

- **Één rij per student/instructeur per week**
- **Week-selectie bij start van AI-weekplanning**
- **Automatische data conversie naar AI formaat**

### 3. Vereenvoudigde Workflow

1. **Week Selectie**: Gebruiker kiest week voor AI-planning
2. **Instructeur**: Stelt beschikbaarheid in voor die week
3. **Leerlingen**: Stelt beschikbaarheid in voor die week
4. **Instellingen**: Configureert AI parameters
5. **Test Planning**: Genereert en toont resultaat

## 🗄️ Database Schema

### student_availability
```sql
CREATE TABLE student_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL, -- maandag van de week
  availability_data JSONB NOT NULL DEFAULT '{}', -- { "maandag": ["09:00", "17:00"], ... }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, week_start)
);
```

### instructor_availability
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

## 🔧 Helper Functies

### get_ai_weekplanning_data()
```sql
SELECT get_ai_weekplanning_data('instructor-uuid', '2025-01-20');
```

Deze functie retourneert direct het JSON formaat dat `generate_week_planning.js` verwacht:

```json
{
  "instructeur": {
    "beschikbareUren": {
      "maandag": ["09:00", "17:00"],
      "dinsdag": ["09:00", "17:00"],
      "woensdag": ["09:00", "13:00"]
    },
    "datums": ["2025-01-20", "2025-01-21", "2025-01-22", ...],
    "maxLessenPerDag": 6,
    "blokuren": true,
    "pauzeTussenLessen": 10,
    "langePauzeDuur": 0,
    "locatiesKoppelen": true
  },
  "leerlingen": [
    {
      "id": "student-uuid",
      "naam": "Emma de Vries",
      "lessenPerWeek": 2,
      "lesDuur": 60,
      "beschikbaarheid": {
        "maandag": ["09:00", "17:00"],
        "woensdag": ["10:00", "16:00"]
      }
    }
  ]
}
```

## 🚀 Implementatie Stappen

### 1. Database Setup
Voer het SQL script uit:
```bash
# Voer new-availability-system.sql uit in Supabase SQL editor
```

### 2. API Routes
- `/api/ai-schedule/create-editable-input`: Gebruikt helper functie
- `/api/ai-schedule/update-availability`: Slaat nieuwe data op

### 3. Frontend
- **Week-selectie**: Nieuwe eerste stap in AI-schedule
- **Directe data conversie**: Geen complexe parsing meer
- **Real-time updates**: Data wordt direct opgeslagen

## 📱 Gebruikerservaring

### Voor Instructeurs
1. **Klik op "AI Weekplanning"** in lessons pagina
2. **Selecteer week** uit dropdown
3. **Stel beschikbaarheid in** per dag
4. **Configureer leerlingen** beschikbaarheid
5. **Pas AI instellingen aan**
6. **Genereer planning** met één klik

### Voor Leerlingen
- Beschikbaarheid wordt per week opgeslagen
- Eenvoudige dag/tijd selectie
- Directe feedback op wijzigingen

## 🔄 Migratie van Oude Data

Het nieuwe systeem begint met lege data. Oude data kan later gemigreerd worden met een apart script.

## ✅ Voordelen

1. **Snellere initialisatie**: Geen complexe data parsing
2. **Betere performance**: JSONB queries zijn sneller
3. **Eenvoudiger onderhoud**: Minder code, duidelijkere structuur
4. **Week-gebaseerd**: Logische organisatie per week
5. **Directe conversie**: Database functies doen het werk
6. **Betere UX**: Stap-voor-stap workflow

## 🧪 Testen

### Database Test
```sql
-- Test helper functie
SELECT get_ai_weekplanning_data('your-instructor-id', '2025-01-20');

-- Test data insertie
INSERT INTO instructor_availability (instructor_id, week_start, availability_data, settings)
VALUES ('instructor-id', '2025-01-20', '{"maandag": ["09:00", "17:00"]}', '{"maxLessenPerDag": 6}');
```

### Frontend Test
1. Ga naar lessons pagina
2. Klik "AI Weekplanning"
3. Selecteer een week
4. Test beschikbaarheid instellen
5. Test AI planning genereren

## 🐛 Bekende Issues

- Geen bekende issues in het nieuwe systeem
- Oude data moet nog gemigreerd worden (optioneel)

## 📈 Toekomstige Verbeteringen

1. **Bulk import**: Importeer beschikbaarheid van Excel/CSV
2. **Templates**: Vooraf gedefinieerde beschikbaarheid patronen
3. **Recurring**: Herhalende beschikbaarheid per week
4. **Notifications**: Notificaties bij beschikbaarheid wijzigingen 