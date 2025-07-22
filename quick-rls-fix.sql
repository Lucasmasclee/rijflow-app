-- Quick RLS fix for instructor_availability
-- IMPORTANT: Run this in your Supabase SQL editor

-- ============================================================================
-- STEP 1: DISABLE RLS TEMPORARILY
-- ============================================================================

-- Disable RLS to test if the issue is with the policy
ALTER TABLE instructor_availability DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: TEST INSERT (if you're logged in)
-- ============================================================================

-- Try a test insert with your current user ID
-- This will only work if you're logged in
DO $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    -- Try to insert a test record
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
    
    RAISE NOTICE 'Test insert successful for user %', current_user_id;
    
    -- Clean up test data
    DELETE FROM instructor_availability 
    WHERE instructor_id = current_user_id 
      AND week_start = '2025-01-20'::date;
      
    RAISE NOTICE 'Test data cleaned up successfully';
  ELSE
    RAISE NOTICE 'No authenticated user found';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: RE-ENABLE RLS WITH BETTER POLICY
-- ============================================================================

-- Re-enable RLS
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;

-- Create a more explicit and permissive policy
CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
  FOR ALL USING (
    -- More explicit check
    auth.uid() IS NOT NULL 
    AND instructor_id IS NOT NULL 
    AND auth.uid()::text = instructor_id::text
  );

-- ============================================================================
-- STEP 4: VERIFICATION
-- ============================================================================

-- Check if the policy was created
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
-- COMPLETION
-- ============================================================================

-- If the test insert worked in STEP 2, then the table structure is fine
-- The new policy should now work correctly

-- If you still get RLS errors after this:
-- 1. The issue might be with how the API is calling the database
-- 2. Try the temporary RLS disable script instead
-- 3. Check if there are any other policies interfering 