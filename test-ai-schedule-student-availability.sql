-- ============================================================================
-- TEST AI SCHEDULE STUDENT AVAILABILITY AUTOMATIC CREATION
-- ============================================================================
-- Dit script test of de automatische creatie van student_availability records
-- correct werkt wanneer een instructeur een week selecteert

-- ============================================================================
-- STAP 1: CONTROLEER DATABASE STRUCTUUR
-- ============================================================================

-- Controleer of alle benodigde tabellen bestaan
SELECT 
    table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = t.table_name
    ) as table_exists
FROM (VALUES 
    ('student_availability'),
    ('instructor_availability'),
    ('standard_availability'),
    ('students')
) as t(table_name);

-- Controleer of alle benodigde kolommen bestaan
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('student_availability', 'instructor_availability', 'standard_availability')
AND column_name IN ('availability_data', 'settings', 'week_start')
ORDER BY table_name, column_name;

-- ============================================================================
-- STAP 2: CONTROLEER RLS POLICIES
-- ============================================================================

-- Controleer RLS policies voor student_availability
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

-- Controleer RLS policies voor instructor_availability
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
WHERE tablename = 'instructor_availability';

-- ============================================================================
-- STAP 3: CONTROLEER BESTAANDE DATA
-- ============================================================================

-- Tel het aantal studenten per instructeur
SELECT 
    s.instructor_id,
    COUNT(*) as student_count
FROM students s
GROUP BY s.instructor_id
ORDER BY student_count DESC;

-- Controleer bestaande student_availability records
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT student_id) as unique_students,
    COUNT(DISTINCT week_start) as unique_weeks
FROM student_availability;

-- Controleer bestaande instructor_availability records
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT instructor_id) as unique_instructors,
    COUNT(DISTINCT week_start) as unique_weeks
FROM instructor_availability;

-- ============================================================================
-- STAP 4: SIMULEER WEEK SELECTIE
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
-- STAP 5: TEST AUTOMATISCHE CREATIE (MANUEEL)
-- ============================================================================

-- Voer dit uit om te simuleren wat er gebeurt wanneer een instructeur een week selecteert
-- Vervang 'YOUR_INSTRUCTOR_ID' met een echte instructor_id uit je database

/*
-- Voorbeeld voor een specifieke instructeur (vervang de UUID):
WITH test_instructor AS (
    SELECT 'YOUR_INSTRUCTOR_ID'::uuid as instructor_id
),
test_week AS (
    SELECT date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day' as week_start
),
missing_students AS (
    SELECT 
        s.id as student_id,
        s.first_name,
        s.last_name
    FROM students s
    CROSS JOIN test_instructor ti
    CROSS JOIN test_week tw
    LEFT JOIN student_availability sa ON s.id = sa.student_id 
        AND sa.week_start = tw.week_start
    WHERE s.instructor_id = ti.instructor_id
    AND sa.id IS NULL
)
SELECT 
    'Would create records for:' as action,
    COUNT(*) as student_count,
    STRING_AGG(first_name || ' ' || last_name, ', ') as student_names
FROM missing_students;
*/

-- ============================================================================
-- STAP 6: CONTROLEER HELPER FUNCTIES
-- ============================================================================

-- Test de get_week_dates functie
SELECT 
    'get_week_dates test' as test_name,
    get_week_dates(date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day') as week_dates;

-- ============================================================================
-- STAP 7: RECOMMENDATIES
-- ============================================================================

-- Toon aanbevelingen voor het testen van de functionaliteit
SELECT 
    'TESTING RECOMMENDATIONS' as section,
    '1. Ga naar /dashboard/ai-schedule' as step_1,
    '2. Selecteer een week' as step_2,
    '3. Controleer of er geen errors zijn' as step_3,
    '4. Ga naar de leerlingen stap' as step_4,
    '5. Controleer of alle leerlingen beschikbaarheid hebben' as step_5,
    '6. Wijzig beschikbaarheid en klik opslaan' as step_6,
    '7. Controleer of wijzigingen worden opgeslagen' as step_7;

-- ============================================================================
-- STAP 8: DEBUGGING INFO
-- ============================================================================

-- Toon debugging informatie
SELECT 
    'DEBUGGING INFO' as section,
    'Check browser console for API calls' as console_logs,
    'Check network tab for /api/ai-schedule/create-editable-input calls' as api_calls,
    'Check database for new student_availability records' as database_check,
    'Check RLS policies if access is denied' as rls_check;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Test script voltooid!
-- 
-- Als je problemen ondervindt:
-- 1. Controleer of alle tabellen bestaan met de juiste structuur
-- 2. Controleer of RLS policies correct zijn ingesteld
-- 3. Controleer of er studenten zijn zonder availability records
-- 4. Test de functionaliteit in de browser
-- 5. Controleer de browser console en network tab voor errors 