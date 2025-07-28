-- Temporary fix: Disable RLS on instructor_availability table
-- ⚠️ WARNING: This disables security - use only for testing!
-- IMPORTANT: Run this in your Supabase SQL editor

-- ============================================================================
-- STEP 1: DISABLE RLS COMPLETELY
-- ============================================================================

-- Disable RLS on instructor_availability table
ALTER TABLE instructor_availability DISABLE ROW LEVEL SECURITY;

-- Drop all policies to be sure
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;

-- ============================================================================
-- STEP 2: VERIFICATION
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
-- STEP 3: TEST INSERT
-- ============================================================================

-- Test insert to verify it works
-- Replace 'your-user-id' with your actual user ID
-- You can get your user ID by running: SELECT auth.uid();

-- INSERT INTO instructor_availability (
--   instructor_id,
--   week_start,
--   availability_data,
--   settings
-- ) VALUES (
--   'your-user-id-here'::uuid,  -- Replace with your actual user ID
--   '2025-01-20'::date,
--   '{"maandag": ["09:00", "17:00"]}'::jsonb,
--   '{"maxLessenPerDag": 6}'::jsonb
-- );

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