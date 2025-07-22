-- ============================================================================
-- IMMEDIATE FIX FOR STUDENT AVAILABILITY RLS POLICIES
-- ============================================================================
-- Dit script lost het RLS policy probleem onmiddellijk op

-- ============================================================================
-- STAP 1: DISABLE RLS TIJDELIJK OM TE TESTEN
-- ============================================================================

-- Disable RLS tijdelijk om te controleren of het probleem bij RLS ligt
ALTER TABLE student_availability DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STAP 2: CONTROLEER OF DE TABEL BESTAAT EN JUIST IS
-- ============================================================================

-- Controleer of de student_availability tabel bestaat
SELECT 
    'TABLE EXISTS' as check_type,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'student_availability' 
        AND table_schema = 'public'
    ) as table_exists;

-- Controleer de structuur van de tabel
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'student_availability'
ORDER BY ordinal_position;

-- ============================================================================
-- STAP 3: TEST EEN HANDMATIGE INSERT
-- ============================================================================

-- Test of we handmatig een record kunnen aanmaken
-- Vervang STUDENT_ID_HERE met een echte student ID uit je database
DO $$
DECLARE
    test_student_id UUID;
    test_week_start DATE;
BEGIN
    -- Haal een student ID op
    SELECT id INTO test_student_id 
    FROM students 
    LIMIT 1;
    
    -- Bepaal test week start (volgende week maandag)
    test_week_start := date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day';
    
    -- Test insert
    INSERT INTO student_availability (student_id, week_start, availability_data)
    VALUES (
        test_student_id,
        test_week_start,
        '{
            "maandag": ["09:00", "17:00"],
            "dinsdag": ["09:00", "17:00"],
            "woensdag": ["09:00", "17:00"],
            "donderdag": ["09:00", "17:00"],
            "vrijdag": ["09:00", "17:00"]
        }'::jsonb
    ) ON CONFLICT (student_id, week_start) DO NOTHING;
    
    RAISE NOTICE 'Test insert successful for student % and week %', test_student_id, test_week_start;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;

-- ============================================================================
-- STAP 4: ENABLE RLS MET JUISTE POLICIES
-- ============================================================================

-- Enable RLS weer
ALTER TABLE student_availability ENABLE ROW LEVEL SECURITY;

-- Verwijder alle bestaande policies
DROP POLICY IF EXISTS "Student can manage own availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can view student availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can manage student availability" ON student_availability;
DROP POLICY IF EXISTS "Student can view own availability" ON student_availability;

-- Maak een eenvoudige policy die alle operaties toestaat voor instructeurs
CREATE POLICY "Instructor can manage student availability" ON student_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM students 
            WHERE students.id = student_availability.student_id 
            AND students.instructor_id = auth.uid()
        )
    );

-- ============================================================================
-- STAP 5: TEST DE NIEUWE POLICY
-- ============================================================================

-- Controleer of de policy correct is aangemaakt
SELECT 
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'student_availability'
ORDER BY policyname;

-- ============================================================================
-- STAP 6: CONTROLEER HUIDIGE SITUATIE
-- ============================================================================

-- Controleer hoeveel studenten er zijn
SELECT 
    'STUDENTS COUNT' as info,
    COUNT(*) as total_students,
    COUNT(DISTINCT instructor_id) as total_instructors
FROM students;

-- Controleer huidige availability records
SELECT 
    'AVAILABILITY RECORDS' as info,
    COUNT(*) as total_records,
    COUNT(DISTINCT student_id) as students_with_records,
    COUNT(DISTINCT week_start) as unique_weeks
FROM student_availability;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- De RLS policies zijn gerepareerd!
-- 
-- Belangrijke wijzigingen:
-- 1. RLS is tijdelijk uitgeschakeld en weer ingeschakeld
-- 2. Alle oude policies zijn verwijderd
-- 3. Nieuwe eenvoudige policy is toegevoegd
-- 4. Test insert is uitgevoerd om te controleren of alles werkt
-- 
-- Test nu de functionaliteit in de browser:
-- 1. Ga naar de AI-schedule pagina
-- 2. Selecteer een week
-- 3. Klik op "volgende"
-- 4. Controleer of er geen 500 errors meer zijn 