-- Debug Instructor Availability RLS Issue
-- IMPORTANT: Run this in your Supabase SQL editor to debug the RLS policy error

-- ============================================================================
-- STEP 1: CHECK CURRENT SITUATION
-- ============================================================================

-- Check current user authentication
SELECT 
  'Current user ID' as info,
  auth.uid() as user_id;

-- Check if current user exists in auth.users
SELECT 
  'User exists in auth.users' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as user_exists;

-- Check current table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'instructor_availability'
ORDER BY ordinal_position;

-- Check current RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'instructor_availability'
ORDER BY policyname;

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'instructor_availability';

-- ============================================================================
-- STEP 2: TEMPORARILY DISABLE RLS FOR TESTING
-- ============================================================================

-- Disable RLS on instructor_availability table
ALTER TABLE instructor_availability DISABLE ROW LEVEL SECURITY;

-- Drop all policies to be sure
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can view their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can insert their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can update their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can delete their own availability" ON instructor_availability;

-- ============================================================================
-- STEP 3: VERIFICATION
-- ============================================================================

-- Check if RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'instructor_availability';

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
-- STEP 4: TEST INSERT (if you're logged in)
-- ============================================================================

-- Test insert to verify it works
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
-- IMPORTANT NOTES
-- ============================================================================

-- ⚠️ SECURITY WARNING:
-- This disables Row Level Security, which means:
-- - Any authenticated user can access any instructor's availability
-- - This is NOT recommended for production use
-- - Only use this for testing and development

-- To re-enable RLS later (when you fix the policy):
-- ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
--   FOR ALL USING (auth.uid() = instructor_id); 