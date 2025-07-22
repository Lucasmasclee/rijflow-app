-- ============================================================================
-- TEST STUDENT AVAILABILITY INSERT
-- ============================================================================
-- Dit script test handmatig of we student_availability records kunnen toevoegen

-- ============================================================================
-- STAP 1: CONTROLEER DATABASE STRUCTUUR
-- ============================================================================

-- Controleer of de tabel bestaat en de juiste structuur heeft
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'student_availability'
ORDER BY ordinal_position;

-- Controleer constraints
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'student_availability';

-- ============================================================================
-- STAP 2: CONTROLEER RLS STATUS
-- ============================================================================

-- Controleer of RLS is ingeschakeld
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
-- STAP 3: HAAL TEST DATA OP
-- ============================================================================

-- Haal een instructeur op
SELECT 
    id as instructor_id,
    email
FROM auth.users 
LIMIT 1;

-- Haal studenten op voor deze instructeur
SELECT 
    s.id as student_id,
    s.first_name,
    s.last_name,
    s.instructor_id
FROM students s
LIMIT 5;

-- ============================================================================
-- STAP 4: TEST HANDMATIGE INSERT
-- ============================================================================

-- Vervang de UUIDs hieronder met echte waarden uit je database
-- Gebruik de resultaten van de bovenstaande queries

/*
-- Voorbeeld voor het testen van een handmatige insert:
-- Vervang 'INSTRUCTOR_ID_HERE' en 'STUDENT_ID_HERE' met echte UUIDs

-- Test 1: Probeer een record toe te voegen
INSERT INTO student_availability (
    student_id,
    week_start,
    availability_data
) VALUES (
    'STUDENT_ID_HERE'::uuid,
    '2025-08-03'::date,
    '{"maandag": ["09:00", "17:00"], "dinsdag": ["09:00", "17:00"]}'::jsonb
);

-- Test 2: Controleer of het record is toegevoegd
SELECT 
    id,
    student_id,
    week_start,
    availability_data,
    created_at
FROM student_availability 
WHERE student_id = 'STUDENT_ID_HERE'::uuid
AND week_start = '2025-08-03'::date;

-- Test 3: Probeer een duplicaat toe te voegen (zou moeten falen vanwege UNIQUE constraint)
INSERT INTO student_availability (
    student_id,
    week_start,
    availability_data
) VALUES (
    'STUDENT_ID_HERE'::uuid,
    '2025-08-03'::date,
    '{"woensdag": ["10:00", "16:00"]}'::jsonb
);
*/

-- ============================================================================
-- STAP 5: TEST MET ECHTE DATA
-- ============================================================================

-- Haal een echte instructeur en student op voor testing
WITH test_data AS (
    SELECT 
        u.id as instructor_id,
        s.id as student_id,
        s.first_name,
        s.last_name
    FROM auth.users u
    JOIN students s ON s.instructor_id = u.id
    LIMIT 1
)
SELECT 
    'Test data found:' as info,
    instructor_id,
    student_id,
    first_name,
    last_name
FROM test_data;

-- ============================================================================
-- STAP 6: CONTROLEER PERMISSIES
-- ============================================================================

-- Controleer of de huidige gebruiker toegang heeft tot de tabel
SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_name = 'student_availability';

-- Controleer of de service role toegang heeft
SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_name = 'student_availability'
AND grantee IN ('service_role', 'anon', 'authenticated');

-- ============================================================================
-- STAP 7: TEST RLS POLICIES
-- ============================================================================

-- Test of de RLS policies correct werken
-- Vervang 'INSTRUCTOR_ID_HERE' met een echte instructor_id

/*
-- Test RLS policy voor een specifieke instructeur
-- Dit zou alleen records moeten tonen voor studenten van die instructeur
SELECT 
    sa.id,
    sa.student_id,
    sa.week_start,
    s.first_name,
    s.last_name,
    s.instructor_id
FROM student_availability sa
JOIN students s ON sa.student_id = s.id
WHERE s.instructor_id = 'INSTRUCTOR_ID_HERE'::uuid;
*/

-- ============================================================================
-- STAP 8: MOGELIJKE OPLOSSINGEN
-- ============================================================================

SELECT 
    'POSSIBLE SOLUTIONS' as section,
    '1. RLS policies zijn te restrictief' as solution_1,
    '2. Tabel structuur is niet correct' as solution_2,
    '3. Constraints worden geschonden' as solution_3,
    '4. Permissies zijn niet correct' as solution_4,
    '5. API route heeft een bug' as solution_5;

-- ============================================================================
-- STAP 9: DEBUGGING COMMANDS
-- ============================================================================

-- Commando's om uit te voeren in Supabase SQL editor:

/*
-- 1. Controleer of de tabel bestaat
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'student_availability');

-- 2. Controleer RLS status
SELECT rowsecurity FROM pg_tables WHERE tablename = 'student_availability';

-- 3. Controleer policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'student_availability';

-- 4. Test handmatige insert (vervang UUIDs)
INSERT INTO student_availability (student_id, week_start, availability_data) 
VALUES ('STUDENT_ID_HERE'::uuid, '2025-08-03'::date, '{}'::jsonb);

-- 5. Controleer resultaat
SELECT * FROM student_availability WHERE week_start = '2025-08-03'::date;
*/

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Test script voltooid!
-- 
-- Voer de queries uit om het probleem te identificeren.
-- 
-- Als handmatige insert werkt maar API niet:
-- - RLS policies zijn het probleem
-- 
-- Als handmatige insert niet werkt:
-- - Tabel structuur of permissies zijn het probleem
-- 
-- Controleer de resultaten en pas de oplossing toe. 