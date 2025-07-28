-- Fix Duplicate Policy Error for instructor_availability
-- IMPORTANT: Run this in your Supabase SQL editor to fix the duplicate policy error

-- ============================================================================
-- STEP 1: REMOVE ALL EXISTING POLICIES
-- ============================================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can view their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can insert their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can update their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can delete their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can select their own availability" ON instructor_availability;

-- ============================================================================
-- STEP 2: VERIFY ALL POLICIES ARE REMOVED
-- ============================================================================

-- Check that no policies exist
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'instructor_availability'
ORDER BY policyname;

-- ============================================================================
-- STEP 3: CREATE NEW POLICIES
-- ============================================================================

-- Create new policies with unique names
CREATE POLICY "Instructors can insert their own availability" ON instructor_availability
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND instructor_id = auth.uid()
  );

CREATE POLICY "Instructors can select their own availability" ON instructor_availability
  FOR SELECT USING (
    auth.uid() IS NOT NULL 
    AND instructor_id = auth.uid()
  );

CREATE POLICY "Instructors can update their own availability" ON instructor_availability
  FOR UPDATE USING (
    auth.uid() IS NOT NULL 
    AND instructor_id = auth.uid()
  );

CREATE POLICY "Instructors can delete their own availability" ON instructor_availability
  FOR DELETE USING (
    auth.uid() IS NOT NULL 
    AND instructor_id = auth.uid()
  );

-- ============================================================================
-- STEP 4: VERIFY NEW POLICIES ARE CREATED
-- ============================================================================

-- Check that the new policies exist
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'instructor_availability'
ORDER BY policyname;

-- ============================================================================
-- STEP 5: TEST INSERT
-- ============================================================================

-- Test insert to verify everything works
DO $$
DECLARE
  current_user_id UUID;
  test_result TEXT;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO instructor_availability (
        instructor_id,
        week_start,
        availability_data,
        settings
      ) VALUES (
        current_user_id,
        '2025-01-23'::date,
        '{"maandag": ["09:00", "17:00"]}'::jsonb,
        '{"maxLessenPerDag": 6}'::jsonb
      ) ON CONFLICT (instructor_id, week_start) DO NOTHING;
      
      test_result := 'SUCCESS: Insert worked with new policies';
      
      -- Clean up test data
      DELETE FROM instructor_availability 
      WHERE instructor_id = current_user_id 
        AND week_start = '2025-01-23'::date;
        
    EXCEPTION WHEN OTHERS THEN
      test_result := 'FAILED: ' || SQLERRM;
    END;
  ELSE
    test_result := 'FAILED: No authenticated user found';
  END IF;
  
  RAISE NOTICE 'Test Result: %', test_result;
END $$; 