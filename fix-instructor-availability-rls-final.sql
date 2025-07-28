-- Fix Instructor Availability RLS Policy - Final Solution
-- IMPORTANT: Run this in your Supabase SQL editor to create a working RLS policy

-- ============================================================================
-- STEP 1: RE-ENABLE RLS
-- ============================================================================

-- Re-enable RLS on instructor_availability table
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructor can modify own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can view their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can insert their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can update their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can delete their own availability" ON instructor_availability;

-- ============================================================================
-- STEP 2: CREATE WORKING RLS POLICIES
-- ============================================================================

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
  ) WITH CHECK (
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
-- STEP 3: VERIFICATION
-- ============================================================================

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'instructor_availability';

-- Check that policies exist
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
-- STEP 4: TEST THE POLICIES
-- ============================================================================

-- Test if current user can access the table
SELECT 
  'Current user ID' as info,
  auth.uid() as user_id;

-- Test if current user exists in auth.users
SELECT 
  'User exists in auth.users' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as user_exists;

-- Test insert (this will only work if you're logged in)
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
      
      test_result := 'SUCCESS: Insert worked with RLS policies';
      
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

-- ✅ SECURITY RESTORED:
-- - Only authenticated users can access the table
-- - Users can only access their own records (instructor_id = auth.uid())
-- - Separate policies for INSERT, SELECT, UPDATE, DELETE operations
-- - This is safe for production use

-- The policies ensure that:
-- 1. Only authenticated users can access the table
-- 2. Users can only see/modify their own availability records
-- 3. Each operation (INSERT, SELECT, UPDATE, DELETE) has its own policy
-- 4. The instructor_id must match the authenticated user's ID 