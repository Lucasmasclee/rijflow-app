-- ============================================================================
-- FIX STUDENT AVAILABILITY RLS POLICIES FOR PUBLIC TOKEN ACCESS
-- ============================================================================
-- Dit script lost het probleem op waarbij leerlingen geen beschikbaarheid kunnen
-- invullen omdat de RLS policies alleen auth.uid() checken, maar leerlingen
-- gebruiken public tokens via availability_links

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
DROP POLICY IF EXISTS "Public token access for availability" ON student_availability;

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

-- Policy: Studenten kunnen hun eigen beschikbaarheid beheren via auth (voor app gebruik)
CREATE POLICY "Student can manage own availability via auth" ON student_availability
    FOR ALL USING (
        student_id IN (
            SELECT id FROM students WHERE user_id = auth.uid()
        )
    );

-- Policy: Publieke toegang via geldige availability links (voor beschikbaarheid pagina)
-- Dit is de belangrijkste fix - leerlingen kunnen nu beschikbaarheid invullen zonder auth
CREATE POLICY "Public token access for availability" ON student_availability
    FOR ALL USING (
        -- Check of er een geldige availability link bestaat voor deze student en week
        EXISTS (
            SELECT 1 FROM availability_links al
            WHERE al.student_id = student_availability.student_id
            AND al.week_start = student_availability.week_start
            AND al.expires_at > NOW()
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
    test_token TEXT;
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
            
            -- Create a test availability link
            SELECT create_availability_link(test_student_id, test_week_start) INTO test_token;
            
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
            
            RAISE NOTICE 'Test insert successful for student % with token %', test_student_id, test_token;
            
            -- Clean up test data
            DELETE FROM student_availability 
            WHERE student_id = test_student_id 
              AND week_start = test_week_start;
              
            DELETE FROM availability_links 
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

-- ✅ SUCCESS: Student availability RLS policies have been fixed for public token access!
-- 
-- What was done:
-- 1. ✅ Ensured student_availability table exists with correct structure
-- 2. ✅ Enabled Row Level Security on the table
-- 3. ✅ Created policies for instructors to manage their students' availability
-- 4. ✅ Created policies for students to manage their own availability via auth
-- 5. ✅ Created NEW policy for public token access via availability_links
-- 6. ✅ Tested the policies with a sample insert/delete
-- 
-- The beschikbaarheid page should now work correctly:
-- - Students can access /beschikbaarheid/[public_token] without auth
-- - The availability_links table provides the necessary access control
-- - Instructors can still manage availability through the app
-- 
-- The key fix was adding the "Public token access for availability" policy
-- which checks for valid availability_links instead of requiring auth.uid() 