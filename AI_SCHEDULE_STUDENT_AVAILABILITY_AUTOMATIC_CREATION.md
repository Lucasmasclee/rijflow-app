# AI Schedule Student Availability Automatic Creation

## 🎯 Overzicht

De AI Schedule functionaliteit is uitgebreid met automatische creatie van `student_availability` records. Wanneer een instructeur een week selecteert in de AI-schedule pagina, worden er automatisch rijen aangemaakt in de `student_availability` tabel voor alle studenten van die rijschool die nog geen beschikbaarheid hebben voor die week.

## 🚀 Wat is er geïmplementeerd

### 1. Automatische Record Creatie
- **Wanneer**: Zodra een instructeur een week selecteert in de AI-schedule pagina
- **Wat**: Er worden automatisch `student_availability` records aangemaakt voor alle studenten die er nog geen hebben
- **Hoe**: De API controleert welke studenten ontbreken en maakt records aan met standaard beschikbaarheid

### 2. Database Structuur
- **student_availability**: JSONB structuur voor flexibele beschikbaarheid opslag
- **instructor_availability**: JSONB structuur voor instructeur beschikbaarheid + instellingen
- **standard_availability**: Fallback beschikbaarheid voor nieuwe records

### 3. Frontend Verbeteringen
- **Directe data loading**: Data wordt geladen zodra een week wordt geselecteerd
- **Real-time updates**: Wijzigingen worden direct opgeslagen
- **Betere error handling**: Duidelijke foutmeldingen bij problemen

## 🔧 Technische Implementatie

### API Routes

#### `/api/ai-schedule/create-editable-input`
```typescript
// Automatische creatie van student availability records
if (students && students.length > 0) {
  const existingStudentIds = studentAvailability?.map(sa => sa.student_id) || []
  const missingStudentIds = students.filter(s => !existingStudentIds.includes(s.id)).map(s => s.id)
  
  if (missingStudentIds.length > 0) {
    // Maak records aan voor ontbrekende studenten
    const studentAvailabilityRecords = missingStudentIds.map(studentId => ({
      student_id: studentId,
      week_start: weekStart,
      availability_data: defaultStudentAvailability
    }))
    
    await supabase.from('student_availability').insert(studentAvailabilityRecords)
  }
}
```

#### `/api/ai-schedule/update-availability`
```typescript
// Update student availability met upsert
for (const student of studentAvailability) {
  if (student.id && student.availability_data) {
    await supabase.from('student_availability').upsert({
      student_id: student.id,
      week_start: weekStart,
      availability_data: student.availability_data
    }, {
      onConflict: 'student_id,week_start'
    })
  }
}
```

### Frontend Wijzigingen

#### Week Selectie
```typescript
// Automatische data loading bij week selectie
onClick={() => {
  setSelectedWeek(week)
  loadWeekData(week) // Data wordt direct geladen
}}
```

#### Data Loading
```typescript
// loadWeekData functie wordt aangeroepen bij week selectie
const loadWeekData = async (weekStart: Date) => {
  // API call naar create-editable-input
  // Automatische creatie van ontbrekende records
  // Data wordt geladen en getoond in UI
}
```

## 📋 Database Schema

### student_availability
```sql
CREATE TABLE student_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  availability_data JSONB NOT NULL DEFAULT '{}',
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
  week_start DATE NOT NULL,
  availability_data JSONB NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instructor_id, week_start)
);
```

### standard_availability
```sql
CREATE TABLE standard_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  availability_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instructor_id)
);
```

## 🔐 RLS Policies

### student_availability
```sql
CREATE POLICY "Instructor can manage student availability" ON student_availability
    FOR ALL USING (
        student_id IN (
            SELECT id FROM students WHERE instructor_id = auth.uid()
        )
    );
```

### instructor_availability
```sql
CREATE POLICY "Instructor can manage own availability" ON instructor_availability
    FOR ALL USING (instructor_id = auth.uid());
```

## 🧪 Testen

### 1. Database Setup
Voer het SQL script uit:
```bash
# Voer fix-ai-schedule-student-availability.sql uit in Supabase SQL editor
```

### 2. Test de Functionaliteit
1. Ga naar `/dashboard/ai-schedule`
2. Selecteer een week
3. Controleer of er geen errors zijn
4. Ga naar de leerlingen stap
5. Controleer of alle leerlingen beschikbaarheid hebben
6. Wijzig beschikbaarheid en klik opslaan
7. Controleer of wijzigingen worden opgeslagen

### 3. Database Verificatie
```sql
-- Controleer of er student_availability records zijn aangemaakt
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT student_id) as unique_students,
    COUNT(DISTINCT week_start) as unique_weeks
FROM student_availability;
```

## 🐛 Troubleshooting

### Probleem: "Failed to create student availability records"
**Oplossing**: Controleer of de RLS policies correct zijn ingesteld

### Probleem: "No data found for the specified instructor and week"
**Oplossing**: Controleer of de `instructor_availability` tabel correct is ingesteld

### Probleem: Studenten hebben geen beschikbaarheid
**Oplossing**: Controleer of de automatische creatie werkt door de browser console te bekijken

### Probleem: Wijzigingen worden niet opgeslagen
**Oplossing**: Controleer of de `update-availability` API correct werkt

## 📝 Workflow

### Voor Instructeurs
1. **Week Selectie**: Kies een week voor AI-planning
2. **Automatische Setup**: System maakt automatisch beschikbaarheid records aan
3. **Instructeur**: Stel beschikbaarheid in voor die week
4. **Leerlingen**: Stel beschikbaarheid in voor die week
5. **Instellingen**: Configureer AI parameters
6. **Test Planning**: Genereer en toon resultaat

### Voor Ontwikkelaars
1. **Database**: Voer SQL scripts uit voor setup
2. **API**: Controleer of routes correct werken
3. **Frontend**: Test week selectie en data loading
4. **RLS**: Controleer policies voor beveiliging

## 🎉 Voordelen

### Voor Instructeurs
- **Geen handmatige setup**: Records worden automatisch aangemaakt
- **Directe toegang**: Data is beschikbaar zodra een week wordt geselecteerd
- **Betere UX**: Geen foutmeldingen over ontbrekende data

### Voor Ontwikkelaars
- **Minder bugs**: Automatische creatie voorkomt ontbrekende data
- **Betere performance**: Data wordt direct geladen
- **Eenvoudiger onderhoud**: Minder complexe error handling

## 📚 Gerelateerde Bestanden

- `src/app/api/ai-schedule/create-editable-input/route.ts` - API voor data loading
- `src/app/api/ai-schedule/update-availability/route.ts` - API voor data opslaan
- `src/app/dashboard/ai-schedule/page.tsx` - Frontend component
- `fix-ai-schedule-student-availability.sql` - Database setup script
- `test-ai-schedule-student-availability.sql` - Test script

## 🔄 Volgende Stappen

1. **Test de functionaliteit** in de browser
2. **Controleer database records** na week selectie
3. **Verificeer RLS policies** voor beveiliging
4. **Monitor API calls** in browser network tab
5. **Rapporteer eventuele problemen** voor verdere debugging 