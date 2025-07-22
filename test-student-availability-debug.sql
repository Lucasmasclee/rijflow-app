-- ============================================================================
-- TEST STUDENT AVAILABILITY DEBUG
-- ============================================================================
-- Dit script helpt bij het debuggen van het probleem met student_availability records

-- ============================================================================
-- STAP 1: CONTROLEER DATABASE STRUCTUUR
-- ============================================================================

-- Controleer of de student_availability tabel bestaat
SELECT 
    'student_availability' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'student_availability'
    ) as table_exists;

-- Controleer de structuur van de student_availability tabel
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'student_availability'
ORDER BY ordinal_position;

-- Controleer of er constraints zijn
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'student_availability';

-- ============================================================================
-- STAP 2: CONTROLEER RLS POLICIES
-- ============================================================================

-- Controleer RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'student_availability';

-- Controleer RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'student_availability';

-- ============================================================================
-- STAP 3: CONTROLEER BESTAANDE DATA
-- ============================================================================

-- Tel het aantal studenten
SELECT 
    COUNT(*) as total_students,
    COUNT(DISTINCT instructor_id) as unique_instructors
FROM students;

-- Toon een paar studenten als voorbeeld
SELECT 
    id,
    first_name,
    last_name,
    instructor_id
FROM students 
LIMIT 5;

-- Controleer bestaande student_availability records
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT student_id) as unique_students,
    COUNT(DISTINCT week_start) as unique_weeks
FROM student_availability;

-- Toon een paar student_availability records als voorbeeld
SELECT 
    id,
    student_id,
    week_start,
    availability_data,
    created_at
FROM student_availability 
LIMIT 5;

-- ============================================================================
-- STAP 4: SIMULEER HET PROBLEEM
-- ============================================================================

-- Bereken de huidige week start (maandag)
WITH current_week_start AS (
    SELECT date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day' as week_start
),
next_week_start AS (
    SELECT date_trunc('week', CURRENT_DATE + INTERVAL '2 weeks') + INTERVAL '1 day' as week_start
)
SELECT 
    'Current week start' as description,
    (SELECT week_start FROM current_week_start) as week_start
UNION ALL
SELECT 
    'Next week start' as description,
    (SELECT week_start FROM next_week_start) as week_start;

-- Controleer welke studenten nog geen availability hebben voor de huidige week
WITH current_week_start AS (
    SELECT date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day' as week_start
),
students_without_availability AS (
    SELECT 
        s.id,
        s.first_name,
        s.last_name,
        s.instructor_id
    FROM students s
    LEFT JOIN student_availability sa ON s.id = sa.student_id 
        AND sa.week_start = (SELECT week_start FROM current_week_start)
    WHERE sa.id IS NULL
)
SELECT 
    COUNT(*) as students_without_availability,
    COUNT(DISTINCT instructor_id) as instructors_affected,
    STRING_AGG(first_name || ' ' || last_name, ', ') as student_names
FROM students_without_availability;

-- ============================================================================
-- STAP 5: TEST MANUELE INSERT
-- ============================================================================

-- Test of we handmatig een record kunnen toevoegen (vervang de UUIDs met echte waarden)
/*
-- Voorbeeld voor het testen van een handmatige insert:
-- Vervang 'STUDENT_ID_HERE' en 'INSTRUCTOR_ID_HERE' met echte UUIDs uit je database

WITH test_week AS (
    SELECT date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day' as week_start
)
SELECT 
    'Would insert record for student:' as action,
    'STUDENT_ID_HERE' as student_id,
    (SELECT week_start FROM test_week) as week_start,
    '{"maandag": ["09:00", "17:00"], "dinsdag": ["09:00", "17:00"]}'::jsonb as availability_data;
*/

-- ============================================================================
-- STAP 6: CONTROLEER PERMISSIES
-- ============================================================================

-- Controleer of de huidige gebruiker toegang heeft tot de tabellen
SELECT 
    table_name,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'student_availability'
AND grantee = current_user;

-- ============================================================================
-- STAP 7: DEBUGGING RECOMMENDATIES
-- ============================================================================

SELECT 
    'DEBUGGING STEPS' as section,
    '1. Controleer browser console voor API calls' as step_1,
    '2. Controleer network tab voor /api/ai-schedule/update-availability calls' as step_2,
    '3. Controleer of RLS policies correct zijn ingesteld' as step_3,
    '4. Controleer of de tabel structuur correct is' as step_4,
    '5. Test handmatige insert om permissies te controleren' as step_5;

-- ============================================================================
-- STAP 8: MOGELIJKE OPLOSSINGEN
-- ============================================================================

SELECT 
    'POSSIBLE SOLUTIONS' as section,
    '1. Voer fix-ai-schedule-student-availability.sql uit' as solution_1,
    '2. Controleer of RLS policies correct zijn' as solution_2,
    '3. Controleer of de gebruiker de juiste permissies heeft' as solution_3,
    '4. Controleer of de tabel constraints correct zijn' as solution_4,
    '5. Test de API routes handmatig' as solution_5;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Debug script voltooid!
-- 
-- Controleer de resultaten van bovenstaande queries om het probleem te identificeren.
-- 
-- Mogelijke oorzaken:
-- 1. RLS policies blokkeren de insert
-- 2. Tabel structuur is niet correct
-- 3. Constraints worden geschonden
-- 4. Permissies zijn niet correct ingesteld
-- 5. API route heeft een bug 