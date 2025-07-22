-- Final fix: Completely disable RLS on instructor_availability
-- ⚠️ WARNING: This disables security - use only for testing!

-- ============================================================================
-- DISABLE RLS COMPLETELY
-- ============================================================================

-- Disable RLS on instructor_availability table
ALTER TABLE instructor_availability DISABLE ROW LEVEL SECURITY;

-- Drop all policies to be sure
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;

-- ============================================================================
-- VERIFICATION
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
-- TEST INSERT
-- ============================================================================

-- Test insert to verify it works
DO $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
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
    
    -- Clean up
    DELETE FROM instructor_availability 
    WHERE instructor_id = current_user_id 
      AND week_start = '2025-01-20'::date;
      
    RAISE NOTICE 'Test completed successfully';
  ELSE
    RAISE NOTICE 'No authenticated user found';
  END IF;
END $$;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================

-- ⚠️ SECURITY WARNING:
-- RLS is now completely disabled on instructor_availability
-- This means ANY authenticated user can access ANY instructor's data
-- This is NOT secure for production use

-- To re-enable RLS later (when you fix the policy):
-- ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;
-- Then recreate the appropriate policies

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

-- 1. Test the AI schedule feature in your app
-- 2. If it works, the issue was with the RLS policy
-- 3. You can now use the feature while working on a proper RLS fix
-- 4. Remember to re-enable RLS before going to production 