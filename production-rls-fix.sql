-- ============================================================================
-- PRODUCTION RLS FIX FOR STUDENT AVAILABILITY
-- ============================================================================
-- Dit script repareert de RLS policies voor productie gebruik
-- Zonder RLS uit te schakelen

-- ============================================================================
-- STAP 1: CONTROLEER HUIDIGE SITUATIE
-- ============================================================================

-- Controleer of de tabel bestaat en RLS enabled is
SELECT 
    'TABLE STATUS' as check_type,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'student_availability' 
        AND table_schema = 'public'
    ) as table_exists,
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'student_availability') as rls_enabled;

-- Controleer huidige policies
SELECT 
    'CURRENT POLICIES' as check_type,
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'student_availability'
ORDER BY policyname;

-- ============================================================================
-- STAP 2: VERWIJDER OUDE POLICIES
-- ============================================================================

-- Verwijder alle bestaande policies om schone slate te hebben
DROP POLICY IF EXISTS "Student can manage own availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can view student availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can manage student availability" ON student_availability;
DROP POLICY IF EXISTS "Student can view own availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can manage their students availability" ON student_availability;

-- ============================================================================
-- STAP 3: MAAK NIEUWE PRODUCTIE POLICIES
-- ============================================================================

-- Policy 1: Instructeurs kunnen ALLE operaties uitvoeren op availability records van hun studenten
CREATE POLICY "Instructor can manage student availability" ON student_availability
    FOR ALL USING (
        student_id IN (
            SELECT id FROM students WHERE instructor_id = auth.uid()
        )
    );

-- Policy 2: Studenten kunnen hun eigen availability records bekijken (voor toekomstig gebruik)
CREATE POLICY "Student can view own availability" ON student_availability
    FOR SELECT USING (
        student_id IN (
            SELECT id FROM students WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- STAP 4: TEST DE POLICIES
-- ============================================================================

-- Controleer of de nieuwe policies correct zijn aangemaakt
SELECT 
    'NEW POLICIES' as check_type,
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'student_availability'
ORDER BY policyname;

-- ============================================================================
-- STAP 5: TEST INSERT MET AUTH CONTEXT
-- ============================================================================

-- Test of we kunnen zien hoeveel studenten er zijn voor de huidige gebruiker
-- (Dit test of de auth.uid() functie werkt)
SELECT 
    'AUTH TEST' as check_type,
    auth.uid() as current_user_id,
    COUNT(*) as total_students_for_user
FROM students 
WHERE instructor_id = auth.uid();

-- ============================================================================
-- STAP 6: CONTROLEER DATABASE STRUCTUUR
-- ============================================================================

-- Controleer of alle benodigde tabellen bestaan
SELECT 
    'TABLE STRUCTURE' as check_type,
    table_name,
    CASE 
        WHEN table_name = 'student_availability' THEN '✓'
        WHEN table_name = 'instructor_availability' THEN '✓'
        WHEN table_name = 'standard_availability' THEN '✓'
        WHEN table_name = 'students' THEN '✓'
        ELSE '?'
    END as status
FROM information_schema.tables 
WHERE table_name IN ('student_availability', 'instructor_availability', 'standard_availability', 'students')
    AND table_schema = 'public'
ORDER BY table_name;

-- Controleer student_availability tabel structuur
SELECT 
    'STUDENT_AVAILABILITY STRUCTURE' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'student_availability'
ORDER BY ordinal_position;

-- ============================================================================
-- STAP 7: TEST DATA INSERT (OPTIONEEL)
-- ============================================================================

-- Test insert met een specifieke student (uncomment om te testen)
/*
DO $$
DECLARE
    test_student_id UUID;
    test_week_start DATE := '2025-07-28'::date;
BEGIN
    -- Haal een student ID op voor de huidige instructeur
    SELECT id INTO test_student_id 
    FROM students 
    WHERE instructor_id = auth.uid()
    LIMIT 1;
    
    IF test_student_id IS NOT NULL THEN
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
    ELSE
        RAISE NOTICE 'No students found for current instructor';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;
*/

-- ============================================================================
-- STAP 8: FINALE CONTROLE
-- ============================================================================

-- Controleer hoeveel studenten er zijn
SELECT 
    'FINAL CHECK' as check_type,
    COUNT(*) as total_students,
    COUNT(DISTINCT instructor_id) as total_instructors
FROM students;

-- Controleer huidige availability records
SELECT 
    'AVAILABILITY RECORDS' as check_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT student_id) as students_with_records,
    COUNT(DISTINCT week_start) as unique_weeks
FROM student_availability;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- ✅ PRODUCTION RLS FIX VOLTOOID!
-- 
-- Belangrijke wijzigingen:
-- 1. Alle oude policies zijn verwijderd
-- 2. Nieuwe productie-ready policy "Instructor can manage student availability" toegevoegd
-- 3. Deze policy staat instructeurs toe om ALLE operaties uit te voeren op availability records van hun studenten
-- 4. Policy "Student can view own availability" toegevoegd voor toekomstig gebruik
-- 5. RLS blijft enabled voor security
-- 
-- Instructeurs kunnen nu:
-- - Student availability records aanmaken voor hun studenten
-- - Student availability records bijwerken
-- - Student availability records verwijderen
-- - Student availability records bekijken
-- 
-- Test de functionaliteit door:
-- 1. In te loggen als instructeur
-- 2. Naar de AI-schedule pagina te gaan
-- 3. Een week te selecteren
-- 4. Op "volgende" te klikken
-- 5. Te controleren of er geen 403 errors meer zijn 