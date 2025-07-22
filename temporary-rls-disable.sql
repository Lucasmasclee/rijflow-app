-- Temporary fix: Disable RLS on instructor_availability table
-- ⚠️ WARNING: This is NOT secure for production!
-- Use this only for testing and development

-- ============================================================================
-- STEP 1: DISABLE RLS
-- ============================================================================

-- Disable RLS on instructor_availability table
ALTER TABLE instructor_availability DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: VERIFY THE FIX
-- ============================================================================

-- Check if RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'instructor_availability';

-- ============================================================================
-- STEP 3: TEST INSERT
-- ============================================================================

-- Test insert to verify the fix works
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

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

-- After running this script:
-- 1. Test the AI schedule feature in your app
-- 2. If it works, the issue was with the RLS policy
-- 3. You can then work on fixing the RLS policy properly
-- 4. Re-enable RLS once the policy is fixed

-- To get your user ID for testing:
-- SELECT auth.uid() as current_user_id; 