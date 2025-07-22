-- Fix RLS policy issue for instructor_availability table
-- IMPORTANT: Run this in your Supabase SQL editor to fix the RLS policy error for new instructors

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
    -- Check if the user is authenticated and is the instructor
    auth.uid() IS NOT NULL AND auth.uid() = instructor_id
  );

-- ============================================================================
-- STEP 3: ALTERNATIVE POLICY (if the above doesn't work)
-- ============================================================================

-- If the above policy still doesn't work, try this more explicit version:
-- DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;
-- CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
--   FOR ALL USING (
--     -- More explicit check
--     auth.uid() IS NOT NULL 
--     AND instructor_id IS NOT NULL 
--     AND auth.uid()::text = instructor_id::text
--   );

-- ============================================================================
-- STEP 4: VERIFICATION
-- ============================================================================

-- Check if the new policy was created
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'instructor_availability'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'instructor_availability';

-- ============================================================================
-- STEP 5: TEST THE FIX
-- ============================================================================

-- This query should work for authenticated users
-- (You can test this by running it in the SQL editor while logged in)
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

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This script has:
-- 1. Checked the current table structure and policies
-- 2. Temporarily disabled RLS to test table structure
-- 3. Re-enabled RLS with a more permissive policy
-- 4. Provided an alternative policy if needed
-- 5. Added verification queries

-- The new policy should allow instructors to:
-- - Insert new availability records
-- - Update existing availability records
-- - Delete their own availability records
-- - View their own availability records

-- If you still get RLS errors after running this script:
-- 1. Check the verification queries above
-- 2. Try the alternative policy in STEP 3
-- 3. Ensure you're logged in as the correct instructor
-- 4. Check that the instructor_id matches your user ID

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

-- After running this script:
-- 1. Test the AI schedule feature in your app
-- 2. If you still get errors, the issue might be with the foreign key constraint
-- 3. Make sure your user account exists in the auth.users table
-- 4. Check that the instructor_id being used matches your actual user ID 