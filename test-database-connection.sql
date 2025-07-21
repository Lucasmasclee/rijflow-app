-- Test database connection and table structure
-- Run this in your Supabase SQL editor to verify everything is working

-- Check if all required tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('students', 'student_availability', 'instructor_availability', 'instructor_ai_settings') 
    THEN '✅ Required table exists'
    ELSE '⚠️ Optional table'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('students', 'student_availability', 'instructor_availability', 'instructor_ai_settings', 'lessons', 'progress_notes')
ORDER BY table_name;

-- Check student_availability table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'student_availability'
ORDER BY ordinal_position;

-- Check if there are any students
SELECT 
  COUNT(*) as total_students,
  COUNT(DISTINCT instructor_id) as unique_instructors
FROM students;

-- Check if there are any student availability records
SELECT 
  COUNT(*) as total_availability_records,
  COUNT(DISTINCT student_id) as students_with_availability
FROM student_availability;

-- Check RLS policies on student_availability
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'student_availability'
ORDER BY policyname; 