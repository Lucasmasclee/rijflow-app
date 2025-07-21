# AI Schedule Student Availability Fix

## 🚨 Probleem
De error "Failed to fetch student availability" treedt op omdat er studenten zijn zonder `student_availability` records in de database.

## 🔧 Oplossing

### Stap 1: Database Fix
Voer het volgende SQL script uit in je Supabase SQL editor:

```sql
-- Fix missing student availability records
-- This script adds empty availability records for all students who don't have any availability yet

-- Calculate the current week start (next Monday)
WITH current_week_start AS (
  SELECT date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day' as week_start
),
students_without_availability AS (
  SELECT DISTINCT s.id as student_id
  FROM students s
  LEFT JOIN student_availability sa ON s.id = sa.student_id 
    AND sa.week_start = (SELECT week_start FROM current_week_start)
  WHERE sa.id IS NULL
)
-- Insert empty availability records for students who don't have any for the current week
INSERT INTO student_availability (student_id, week_start, notes)
SELECT 
  swa.student_id,
  (SELECT week_start FROM current_week_start),
  '{}' -- Empty JSON object as notes
FROM students_without_availability swa
ON CONFLICT (student_id, week_start) DO NOTHING;
```

### Stap 2: API Fix
De API route is al aangepast om:
- Correct student IDs te gebruiken in plaats van instructor_id
- Betere error handling te hebben
- Lege beschikbaarheid te accepteren

### Stap 3: Frontend Fix
De frontend is aangepast om:
- Betere foutmeldingen te tonen
- Specifieke error cases af te handelen

## 🧪 Testen

### Test 1: Database Check
Voer dit script uit om te controleren of alles correct is ingesteld:

```sql
-- Check if there are any students
SELECT 
  COUNT(*) as total_students,
  COUNT(DISTINCT instructor_id) as unique_instructors
FROM students;

-- Check if there are any student availability records
SELECT 
  COUNT(*) as total_availability_records,
  COUNT(DISTINCT student_id) as students_with_availability
FROM student_availability;
```

### Test 2: API Test
1. Ga naar `/dashboard/lessons`
2. Klik op "AI Weekplanning"
3. Selecteer een week
4. Controleer of er geen error meer optreedt

## 📋 Wat is er aangepast

### API Route (`/api/ai-schedule/create-editable-input`)
- ✅ Verwijderd `instructor_id` filter uit student_availability query
- ✅ Toegevoegd `student_id` filter met alle student IDs van de instructeur
- ✅ Verbeterde error handling
- ✅ Toegevoegd check voor lege studenten lijst
- ✅ Verwijderd `instructor_id` uit lege beschikbaarheid insert

### Frontend (`/dashboard/lessons`)
- ✅ Verbeterde error handling met specifieke foutmeldingen
- ✅ Betere gebruikersfeedback

### Database
- ✅ SQL script om lege beschikbaarheid records toe te voegen
- ✅ Test script om database status te controleren

## 🔍 Troubleshooting

### Als de error blijft optreden:

1. **Controleer of er studenten zijn:**
   ```sql
   SELECT COUNT(*) FROM students WHERE instructor_id = 'your-user-id';
   ```

2. **Controleer of student_availability tabel bestaat:**
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'student_availability';
   ```

3. **Controleer RLS policies:**
   ```sql
   SELECT policyname FROM pg_policies 
   WHERE tablename = 'student_availability';
   ```

4. **Controleer of je ingelogd bent als instructeur:**
   - Ga naar `/dashboard/students` om te controleren of je studenten ziet

### Veelvoorkomende problemen:

1. **Geen studenten:** Voeg eerst studenten toe via `/dashboard/students/new`
2. **Geen RLS policies:** Voer het `fix-student-availability-policy.sql` script uit
3. **Database connectie:** Controleer of Supabase correct is geconfigureerd

## ✅ Verwachte resultaten

Na het uitvoeren van de fixes zou je moeten zien:
- ✅ Geen "Failed to fetch student availability" error meer
- ✅ AI Weekplanning werkt correct
- ✅ Alle studenten hebben beschikbaarheid records (zelfs lege)
- ✅ Betere foutmeldingen in de UI 