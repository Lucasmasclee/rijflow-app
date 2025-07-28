-- Fix RLS policy issue for instructor_availability table
-- IMPORTANT: Run this in your Supabase SQL editor to fix the RLS policy error

-- ============================================================================
-- STEP 1: CHECK CURRENT SITUATION
-- ============================================================================

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

-- ============================================================================
-- STEP 2: FIX RLS POLICY
-- ============================================================================

-- First, disable RLS temporarily to check if that's the issue
ALTER TABLE instructor_availability DISABLE ROW LEVEL SECURITY;

-- Check if we can insert data (this will only work if you're logged in)
-- We'll use a SELECT to check the current user instead of inserting test data
SELECT 
  'Current user ID' as info,
  auth.uid() as user_id;

-- Check if the current user exists in auth.users
SELECT 
  'User exists in auth.users' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as user_exists;

-- Re-enable RLS
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;

-- Create a more permissive policy that should work for all instructors
CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
  FOR ALL USING (
    -- More explicit check with proper type casting
    auth.uid() IS NOT NULL 
    AND instructor_id IS NOT NULL 
    AND auth.uid()::text = instructor_id::text
  );

-- ============================================================================
-- STEP 3: ALTERNATIVE POLICY (if the above doesn't work)
-- ============================================================================

-- If the above policy still doesn't work, try this more permissive version:
-- DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;
-- CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
--   FOR ALL USING (true);

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
-- STEP 5: TEST INSERT (if you're logged in)
-- ============================================================================

-- Test insert to verify the fix works
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
-- COMPLETION
-- ============================================================================

-- If the test insert worked, then the table structure is fine
-- The new policy should now work correctly

-- If you still get RLS errors after this:
-- 1. The issue might be with how the API is calling the database
-- 2. Try the temporary RLS disable script instead
-- 3. Check if there are any other policies interfering 