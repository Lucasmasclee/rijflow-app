-- ============================================================================
-- TEST STUDENT AVAILABILITY AUTOMATIC CREATION
-- ============================================================================
-- Dit script test of de automatische creatie van student availability records werkt

-- ============================================================================
-- STAP 1: CONTROLEER HUIDIGE SITUATIE
-- ============================================================================

-- Controleer hoeveel studenten er zijn
SELECT 
    'STUDENTS OVERVIEW' as section,
    COUNT(*) as total_students,
    COUNT(DISTINCT instructor_id) as total_instructors
FROM students;

-- Controleer huidige student availability records
SELECT 
    'CURRENT AVAILABILITY RECORDS' as section,
    COUNT(*) as total_records,
    COUNT(DISTINCT student_id) as students_with_records,
    COUNT(DISTINCT week_start) as unique_weeks
FROM student_availability;

-- ============================================================================
-- STAP 2: CONTROLEER RLS POLICIES
-- ============================================================================

-- Controleer of de juiste policies bestaan
SELECT 
    'RLS POLICIES' as section,
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'student_availability'
ORDER BY policyname;

-- ============================================================================
-- STAP 3: TEST AUTOMATISCHE CREATIE
-- ============================================================================

-- Test week (volgende week)
WITH test_week AS (
    SELECT date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day' as week_start
),
students_without_availability AS (
    SELECT DISTINCT s.id as student_id, s.first_name, s.last_name, s.instructor_id
    FROM students s
    LEFT JOIN student_availability sa ON s.id = sa.student_id 
        AND sa.week_start = (SELECT week_start FROM test_week)
    WHERE sa.id IS NULL
)
SELECT 
    'STUDENTS WITHOUT AVAILABILITY' as section,
    COUNT(*) as missing_students,
    STRING_AGG(first_name || ' ' || last_name, ', ') as student_names
FROM students_without_availability;

-- ============================================================================
-- STAP 4: SIMULEER AUTOMATISCHE CREATIE
-- ============================================================================

-- Haal standaard beschikbaarheid op voor instructeurs
SELECT 
    'STANDARD AVAILABILITY' as section,
    instructor_id,
    availability_data
FROM standard_availability
LIMIT 5;

-- ============================================================================
-- STAP 5: CONTROLEER DATABASE STRUCTUUR
-- ============================================================================

-- Controleer of alle benodigde kolommen bestaan
SELECT 
    'TABLE STRUCTURE' as section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'student_availability'
ORDER BY ordinal_position;

-- ============================================================================
-- STAP 6: TEST DATA INSERT (MANUEEL)
-- ============================================================================

-- Test of we handmatig een record kunnen aanmaken (vervang INSTRUCTOR_ID en STUDENT_ID)
-- Dit is alleen voor testing - in productie wordt dit automatisch gedaan

/*
-- Voorbeeld van handmatige insert (uncomment en pas aan):
INSERT INTO student_availability (student_id, week_start, availability_data)
VALUES (
    'STUDENT_ID_HERE', 
    date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day',
    '{
        "maandag": ["09:00", "17:00"],
        "dinsdag": ["09:00", "17:00"],
        "woensdag": ["09:00", "17:00"],
        "donderdag": ["09:00", "17:00"],
        "vrijdag": ["09:00", "17:00"]
    }'::jsonb
) ON CONFLICT (student_id, week_start) DO NOTHING;
*/

-- ============================================================================
-- STAP 7: CONTROLEER INDEXES
-- ============================================================================

-- Controleer of de juiste indexes bestaan
SELECT 
    'INDEXES' as section,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'student_availability'
ORDER BY indexname;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Test resultaten:
-- 
-- 1. Als er studenten zijn zonder availability records, dan moet de automatische creatie deze aanmaken
-- 2. De RLS policies moeten correct zijn ingesteld
-- 3. De database structuur moet compleet zijn
-- 4. Alle indexes moeten bestaan voor optimale performance
-- 
-- Om de functionaliteit te testen:
-- 1. Ga naar de AI-schedule pagina in de browser
-- 2. Selecteer een week
-- 3. Klik op "volgende"
-- 4. Controleer of er geen errors zijn in de browser console
-- 5. Controleer of er nieuwe student availability records zijn aangemaakt 