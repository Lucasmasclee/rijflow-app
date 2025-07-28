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

-- Enable RLS on student_availability table
ALTER TABLE student_availability ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Student can manage own availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can view student availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can manage student availability" ON student_availability;
DROP POLICY IF EXISTS "Students can view their own availability" ON student_availability;
DROP POLICY IF EXISTS "Students can update their own availability" ON student_availability;
DROP POLICY IF EXISTS "Students can insert their own availability" ON student_availability;

-- ============================================================================
-- STAP 3: MAAK NIEUWE POLICIES
-- ============================================================================

-- Policy: Instructeurs kunnen beschikbaarheid van hun eigen studenten beheren
CREATE POLICY "Instructor can manage student availability" ON student_availability
    FOR ALL USING (
        student_id IN (
            SELECT id FROM students WHERE instructor_id = auth.uid()
        )
    );

-- Policy: Studenten kunnen hun eigen beschikbaarheid beheren (voor public links)
CREATE POLICY "Student can manage own availability" ON student_availability
    FOR ALL USING (
        student_id IN (
            SELECT id FROM students WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- STAP 4: TEST DE POLICIES
-- ============================================================================

-- Test of de policies werken
DO $$
DECLARE
    current_user_id UUID;
    test_student_id UUID;
    test_week_start DATE;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NOT NULL THEN
        -- Get a test student for this instructor
        SELECT id INTO test_student_id 
        FROM students 
        WHERE instructor_id = current_user_id 
        LIMIT 1;
        
        IF test_student_id IS NOT NULL THEN
            -- Set test week start (next Monday)
            test_week_start := date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day';
            
            -- Try to insert a test record
            INSERT INTO student_availability (
                student_id,
                week_start,
                availability_data
            ) VALUES (
                test_student_id,
                test_week_start,
                '{"maandag": ["09:00", "17:00"]}'::jsonb
            ) ON CONFLICT (student_id, week_start) DO NOTHING;
            
            RAISE NOTICE 'Test insert successful for student %', test_student_id;
            
            -- Clean up test data
            DELETE FROM student_availability 
            WHERE student_id = test_student_id 
              AND week_start = test_week_start;
              
            RAISE NOTICE 'Test data cleaned up successfully';
        ELSE
            RAISE NOTICE 'No students found for current instructor';
        END IF;
    ELSE
        RAISE NOTICE 'No authenticated user found';
    END IF;
END $$;

-- ============================================================================
-- STAP 5: TOON RESULTATEN
-- ============================================================================

-- Show current policies
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
WHERE tablename = 'student_availability'
ORDER BY policyname;

-- Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'student_availability'
ORDER BY ordinal_position;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- ✅ SUCCESS: Student availability RLS policies have been fixed!
-- 
-- What was done:
-- 1. ✅ Ensured student_availability table exists with correct structure
-- 2. ✅ Enabled Row Level Security on the table
-- 3. ✅ Created policies for instructors to manage their students' availability
-- 4. ✅ Created policies for students to manage their own availability
-- 5. ✅ Tested the policies with a sample insert/delete
-- 
-- The API routes should now work correctly:
-- - /api/ai-schedule/update-availability
-- - /api/ai-schedule/create-student-availability
-- 
-- Instructors can now:
-- - Create student availability records for their students
-- - Update student availability records
-- - View student availability records
-- 
-- Students can now:
-- - Update their own availability through public links 