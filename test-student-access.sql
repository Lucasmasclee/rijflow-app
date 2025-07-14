-- Test script to verify student_availability access is working
-- Run this after applying the fix-student-availability-policy.sql script

-- Test 1: Check if the policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'student_availability'
ORDER BY policyname;

-- Test 2: Check if RLS is enabled on the table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'student_availability';

-- Test 3: Test instructor access (this should work for authenticated instructors)
-- Note: This will only work if you're logged in as an instructor with students
SELECT 
  sa.student_id,
  sa.week_start,
  sa.notes,
  s.first_name,
  s.last_name
FROM student_availability sa
JOIN students s ON sa.student_id = s.id
LIMIT 5;

-- Test 4: Check if there are any students with availability data
SELECT 
  COUNT(*) as total_availability_records,
  COUNT(DISTINCT student_id) as unique_students_with_availability
FROM student_availability;

-- Test 5: Check if there are any students linked to instructors
SELECT 
  COUNT(*) as total_students,
  COUNT(DISTINCT instructor_id) as unique_instructors
FROM students; 