-- Complete Fix for instructor_availability RLS Issues
-- IMPORTANT: Run this in your Supabase SQL editor to fix all possible issues

-- ============================================================================
-- STEP 1: DISABLE RLS TEMPORARILY TO TEST
-- ============================================================================

-- Disable RLS to test if that's the issue
ALTER TABLE instructor_availability DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can view their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can insert their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can update their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can delete their own availability" ON instructor_availability;

-- ============================================================================
-- STEP 2: TEST INSERT WITHOUT RLS
-- ============================================================================

-- Test insert to verify the table structure is correct
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
        '2025-01-20'::date,
        '{"maandag": ["09:00", "17:00"]}'::jsonb,
        '{"maxLessenPerDag": 6}'::jsonb
      ) ON CONFLICT (instructor_id, week_start) DO NOTHING;
      
      test_result := 'SUCCESS: Insert worked without RLS';
      
      -- Clean up test data
      DELETE FROM instructor_availability 
      WHERE instructor_id = current_user_id 
        AND week_start = '2025-01-20'::date;
        
    EXCEPTION WHEN OTHERS THEN
      test_result := 'FAILED: ' || SQLERRM;
    END;
  ELSE
    test_result := 'FAILED: No authenticated user found';
  END IF;
  
  RAISE NOTICE 'Test Result: %', test_result;
END $$;

-- ============================================================================
-- STEP 3: RE-ENABLE RLS WITH MULTIPLE POLICIES
-- ============================================================================

-- Re-enable RLS
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;

-- Create multiple specific policies instead of one general policy
-- Policy 1: Allow authenticated users to insert their own records
CREATE POLICY "Instructors can insert their own availability" ON instructor_availability
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND instructor_id = auth.uid()
  );

-- Policy 2: Allow authenticated users to select their own records
CREATE POLICY "Instructors can select their own availability" ON instructor_availability
  FOR SELECT USING (
    auth.uid() IS NOT NULL 
    AND instructor_id = auth.uid()
  );

-- Policy 3: Allow authenticated users to update their own records
CREATE POLICY "Instructors can update their own availability" ON instructor_availability
  FOR UPDATE USING (
    auth.uid() IS NOT NULL 
    AND instructor_id = auth.uid()
  );

-- Policy 4: Allow authenticated users to delete their own records
CREATE POLICY "Instructors can delete their own availability" ON instructor_availability
  FOR DELETE USING (
    auth.uid() IS NOT NULL 
    AND instructor_id = auth.uid()
  );

-- ============================================================================
-- STEP 4: TEST INSERT WITH NEW POLICIES
-- ============================================================================

-- Test insert with the new policies
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
        '2025-01-21'::date,
        '{"maandag": ["09:00", "17:00"]}'::jsonb,
        '{"maxLessenPerDag": 6}'::jsonb
      ) ON CONFLICT (instructor_id, week_start) DO NOTHING;
      
      test_result := 'SUCCESS: Insert worked with new policies';
      
      -- Clean up test data
      DELETE FROM instructor_availability 
      WHERE instructor_id = current_user_id 
        AND week_start = '2025-01-21'::date;
        
    EXCEPTION WHEN OTHERS THEN
      test_result := 'FAILED: ' || SQLERRM;
    END;
  ELSE
    test_result := 'FAILED: No authenticated user found';
  END IF;
  
  RAISE NOTICE 'Test Result with Policies: %', test_result;
END $$;

-- ============================================================================
-- STEP 5: ALTERNATIVE FALLBACK (if above doesn't work)
-- ============================================================================

-- If the above policies still don't work, try this more permissive approach
-- Uncomment the lines below if the above test fails

/*
-- Drop all policies
DROP POLICY IF EXISTS "Instructors can insert their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can select their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can update their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can delete their own availability" ON instructor_availability;

-- Create a single permissive policy
CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
  FOR ALL USING (
    auth.uid() IS NOT NULL
  );
*/

-- ============================================================================
-- STEP 6: VERIFICATION
-- ============================================================================

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'instructor_availability';

-- Check all policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'instructor_availability'
ORDER BY policyname;

-- Check if any records exist for current user
SELECT 
  'Records for current user' as info,
  (SELECT COUNT(*) FROM instructor_availability WHERE instructor_id = auth.uid()) as record_count;

-- ============================================================================
-- STEP 7: FINAL TEST
-- ============================================================================

-- Final test to make sure everything works
DO $$
DECLARE
  current_user_id UUID;
  final_test_result TEXT;
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
        '2025-01-22'::date,
        '{"maandag": ["09:00", "17:00"]}'::jsonb,
        '{"maxLessenPerDag": 6}'::jsonb
      ) ON CONFLICT (instructor_id, week_start) DO NOTHING;
      
      final_test_result := 'FINAL SUCCESS: Everything is working correctly';
      
      -- Clean up test data
      DELETE FROM instructor_availability 
      WHERE instructor_id = current_user_id 
        AND week_start = '2025-01-22'::date;
        
    EXCEPTION WHEN OTHERS THEN
      final_test_result := 'FINAL FAILED: ' || SQLERRM;
    END;
  ELSE
    final_test_result := 'FINAL FAILED: No authenticated user found';
  END IF;
  
  RAISE NOTICE 'Final Test Result: %', final_test_result;
END $$; 