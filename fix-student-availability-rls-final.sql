-- ============================================================================
-- FINAL FIX FOR STUDENT AVAILABILITY RLS POLICIES
-- ============================================================================
-- Dit script zorgt ervoor dat instructeurs student availability records kunnen
-- aanmaken en beheren voor hun eigen studenten

-- ============================================================================
-- STAP 1: CONTROLEER EN REPAREER STUDENT_AVAILABILITY TABEL
-- ============================================================================

-- Controleer of de student_availability tabel bestaat met de juiste structuur
DO $$
BEGIN
    -- Controleer of de tabel bestaat
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'student_availability') THEN
        -- Maak de tabel aan als deze niet bestaat
        CREATE TABLE student_availability (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
            week_start DATE NOT NULL,
            availability_data JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(student_id, week_start)
        );
        
        -- Maak indexes
        CREATE INDEX idx_student_availability_student_id ON student_availability(student_id);
        CREATE INDEX idx_student_availability_week_start ON student_availability(week_start);
        CREATE INDEX idx_student_availability_json ON student_availability USING GIN (availability_data);
        
        RAISE NOTICE 'student_availability tabel aangemaakt';
    END IF;
END $$;

-- ============================================================================
-- STAP 2: ZET RLS AAN EN REPAREER POLICIES
-- ============================================================================

-- Enable RLS op student_availability tabel
ALTER TABLE student_availability ENABLE ROW LEVEL SECURITY;

-- Verwijder alle bestaande policies om schone slate te hebben
DROP POLICY IF EXISTS "Student can manage own availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can view student availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can manage student availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can manage their students availability" ON student_availability;

-- ============================================================================
-- STAP 3: MAAK NIEUWE POLICIES
-- ============================================================================

-- Policy 1: Instructeurs kunnen availability records beheren voor hun eigen studenten
CREATE POLICY "Instructor can manage student availability" ON student_availability
    FOR ALL USING (
        student_id IN (
            SELECT id FROM students WHERE instructor_id = auth.uid()
        )
    );

-- Policy 2: Studenten kunnen hun eigen availability records bekijken (optioneel)
CREATE POLICY "Student can view own availability" ON student_availability
    FOR SELECT USING (
        student_id IN (
            SELECT id FROM students WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- STAP 4: TEST DE POLICIES
-- ============================================================================

-- Test of de policies correct zijn ingesteld
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'student_availability'
ORDER BY policyname;

-- ============================================================================
-- STAP 5: CONTROLEER DATABASE STRUCTUUR
-- ============================================================================

-- Controleer of alle benodigde tabellen bestaan
SELECT 
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

-- ============================================================================
-- STAP 6: TEST DATA INSERT
-- ============================================================================

-- Test of we kunnen zien hoeveel studenten er zijn
SELECT 
    COUNT(*) as total_students,
    COUNT(DISTINCT instructor_id) as total_instructors
FROM students;

-- Test of er al student availability records bestaan
SELECT 
    COUNT(*) as total_availability_records,
    COUNT(DISTINCT student_id) as students_with_availability,
    COUNT(DISTINCT week_start) as unique_weeks
FROM student_availability;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- De RLS policies voor student_availability zijn succesvol gerepareerd!
-- 
-- Belangrijke wijzigingen:
-- 1. Alle oude policies zijn verwijderd
-- 2. Nieuwe policy "Instructor can manage student availability" toegevoegd
-- 3. Deze policy staat instructeurs toe om ALLE operaties uit te voeren op availability records van hun studenten
-- 4. Policy "Student can view own availability" toegevoegd voor studenten
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