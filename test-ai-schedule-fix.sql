-- Test AI Schedule Fix
-- This script tests if the AI schedule fix works correctly

-- ============================================================================
-- STEP 1: CHECK TABLES EXIST
-- ============================================================================

-- Check if all required tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'standard_availability' THEN '✅ Standard availability table exists'
    WHEN table_name = 'instructor_availability' THEN '✅ Instructor availability table exists'
    WHEN table_name = 'student_availability' THEN '✅ Student availability table exists'
    ELSE '❌ Unknown table'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('standard_availability', 'instructor_availability', 'student_availability')
ORDER BY table_name;

-- ============================================================================
-- STEP 2: CHECK TABLE STRUCTURES
-- ============================================================================

-- Check standard_availability columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'standard_availability'
ORDER BY ordinal_position;

-- Check instructor_availability columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'instructor_availability'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 3: CHECK RLS POLICIES
-- ============================================================================

-- Check RLS policies for standard_availability
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'standard_availability'
ORDER BY policyname;

-- Check RLS policies for instructor_availability
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
-- STEP 4: CHECK DATA
-- ============================================================================

-- Count instructors with standard_availability
SELECT 
  COUNT(*) as total_instructors_with_standard_availability
FROM standard_availability;

-- Count instructors with instructor_availability
SELECT 
  COUNT(DISTINCT instructor_id) as total_instructors_with_availability
FROM instructor_availability;

-- Show sample standard_availability data
SELECT 
  instructor_id,
  availability_data,
  created_at
FROM standard_availability
LIMIT 3;

-- ============================================================================
-- STEP 5: TEST FUNCTIONS
-- ============================================================================

-- Test get_standard_availability function
DO $$
DECLARE
  test_instructor_id UUID;
  test_result JSONB;
BEGIN
  -- Get an instructor who has students
  SELECT instructor_id INTO test_instructor_id
  FROM students
  LIMIT 1;
  
  IF test_instructor_id IS NOT NULL THEN
    -- Test the function
    SELECT get_standard_availability(test_instructor_id) INTO test_result;
    
    IF test_result IS NOT NULL AND test_result != '{}'::jsonb THEN
      RAISE NOTICE '✅ get_standard_availability function works correctly for instructor %', test_instructor_id;
      RAISE NOTICE 'Result: %', test_result;
    ELSE
      RAISE NOTICE '⚠️ get_standard_availability function returned empty result for instructor %', test_instructor_id;
    END IF;
  ELSE
    RAISE NOTICE '⚠️ No instructors with students found for testing';
  END IF;
END $$;

-- Test get_ai_weekplanning_data function
DO $$
DECLARE
  test_instructor_id UUID;
  test_result JSONB;
  test_week_start DATE;
BEGIN
  -- Get an instructor who has students
  SELECT instructor_id INTO test_instructor_id
  FROM students
  LIMIT 1;
  
  IF test_instructor_id IS NOT NULL THEN
    -- Use current week's Monday
    test_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Test the function
    SELECT get_ai_weekplanning_data(test_instructor_id, test_week_start) INTO test_result;
    
    IF test_result IS NOT NULL AND test_result != '{}'::jsonb THEN
      RAISE NOTICE '✅ get_ai_weekplanning_data function works correctly for instructor % and week %', test_instructor_id, test_week_start;
      
      -- Check if the result has the expected structure
      IF test_result ? 'instructeur' AND test_result ? 'leerlingen' THEN
        RAISE NOTICE '✅ Result has correct structure with instructeur and leerlingen';
        
        -- Check if leerlingen array is not empty
        IF jsonb_array_length(test_result->'leerlingen') > 0 THEN
          RAISE NOTICE '✅ Result contains % students', jsonb_array_length(test_result->'leerlingen');
        ELSE
          RAISE NOTICE '⚠️ Result contains no students';
        END IF;
      ELSE
        RAISE NOTICE '❌ Result missing expected structure (instructeur or leerlingen)';
      END IF;
    ELSE
      RAISE NOTICE '⚠️ get_ai_weekplanning_data function returned empty result for instructor % and week %', test_instructor_id, test_week_start;
    END IF;
  ELSE
    RAISE NOTICE '⚠️ No instructors with students found for testing';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: SUMMARY
-- ============================================================================

-- Show summary of all tables and their data
SELECT 
  'standard_availability' as table_name,
  (SELECT COUNT(*) FROM standard_availability) as record_count
UNION ALL
SELECT 
  'instructor_availability' as table_name,
  (SELECT COUNT(*) FROM instructor_availability) as record_count
UNION ALL
SELECT 
  'student_availability' as table_name,
  (SELECT COUNT(*) FROM student_availability) as record_count
ORDER BY table_name;

-- Show instructors without standard_availability
SELECT 
  COUNT(*) as instructors_without_standard_availability
FROM students s
LEFT JOIN standard_availability sa ON s.instructor_id = sa.instructor_id
WHERE sa.instructor_id IS NULL;

-- Show instructors without instructor_availability for current week
SELECT 
  COUNT(DISTINCT s.instructor_id) as instructors_without_week_availability
FROM students s
LEFT JOIN instructor_availability ia ON s.instructor_id = ia.instructor_id 
  AND ia.week_start = DATE_TRUNC('week', CURRENT_DATE)::DATE
WHERE ia.instructor_id IS NULL; 