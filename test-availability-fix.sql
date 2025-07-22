-- Test script to verify availability tables are working correctly
-- Run this after applying the fix-instructor-availability-table.sql script

-- ============================================================================
-- TEST 1: CHECK TABLE STRUCTURES
-- ============================================================================

-- Check student_availability table structure
SELECT 
  'student_availability' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'student_availability'
ORDER BY ordinal_position;

-- Check instructor_availability table structure
SELECT 
  'instructor_availability' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'instructor_availability'
ORDER BY ordinal_position;

-- ============================================================================
-- TEST 2: CHECK RLS POLICIES
-- ============================================================================

-- Check student_availability policies
SELECT 
  'student_availability' as table_name,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'student_availability'
ORDER BY policyname;

-- Check instructor_availability policies
SELECT 
  'instructor_availability' as table_name,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'instructor_availability'
ORDER BY policyname;

-- ============================================================================
-- TEST 3: CHECK HELPER FUNCTIONS
-- ============================================================================

-- Check if helper functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_ai_weekplanning_data', 'get_week_dates')
ORDER BY routine_name;

-- ============================================================================
-- TEST 4: TEST DATA INSERTION (if you have students)
-- ============================================================================

-- Check if there are any students
SELECT 
  COUNT(*) as total_students,
  COUNT(DISTINCT instructor_id) as unique_instructors
FROM students;

-- Check if there are any existing availability records
SELECT 
  'student_availability' as table_name,
  COUNT(*) as total_records
FROM student_availability
UNION ALL
SELECT 
  'instructor_availability' as table_name,
  COUNT(*) as total_records
FROM instructor_availability;

-- ============================================================================
-- TEST 5: VERIFY JSONB SUPPORT
-- ============================================================================

-- Test JSONB operations on instructor_availability
-- This should work without errors if the table structure is correct
SELECT 
  'JSONB test passed' as test_result
WHERE EXISTS (
  SELECT 1 
  FROM instructor_availability 
  WHERE availability_data = '{}'::jsonb
  LIMIT 1
);

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================

-- After running the fix script, you should see:
-- 1. student_availability table with: id, student_id, week_start, availability_data (JSONB), created_at, updated_at
-- 2. instructor_availability table with: id, instructor_id, week_start, availability_data (JSONB), settings (JSONB), created_at, updated_at
-- 3. RLS policies for both tables
-- 4. Helper functions: get_ai_weekplanning_data and get_week_dates
-- 5. No errors when testing JSONB operations

-- If all tests pass, the AI schedule feature should work without RLS policy errors. 