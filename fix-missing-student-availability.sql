-- Fix missing student availability records
-- This script adds empty availability records for all students who don't have any availability yet

-- First, let's see which students don't have any availability records
SELECT 
  s.id,
  s.first_name,
  s.last_name,
  s.instructor_id,
  COUNT(sa.id) as availability_records
FROM students s
LEFT JOIN student_availability sa ON s.id = sa.student_id
GROUP BY s.id, s.first_name, s.last_name, s.instructor_id
HAVING COUNT(sa.id) = 0
ORDER BY s.first_name, s.last_name;

-- Calculate the next 5 weeks starting from next Monday
-- This will be used to create availability records for the upcoming weeks
WITH week_starts AS (
  SELECT 
    date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day' as week_start
  UNION ALL
  SELECT 
    date_trunc('week', CURRENT_DATE + INTERVAL '2 weeks') + INTERVAL '1 day'
  UNION ALL
  SELECT 
    date_trunc('week', CURRENT_DATE + INTERVAL '3 weeks') + INTERVAL '1 day'
  UNION ALL
  SELECT 
    date_trunc('week', CURRENT_DATE + INTERVAL '4 weeks') + INTERVAL '1 day'
  UNION ALL
  SELECT 
    date_trunc('week', CURRENT_DATE + INTERVAL '5 weeks') + INTERVAL '1 day'
),
students_without_availability AS (
  SELECT DISTINCT s.id as student_id
  FROM students s
  LEFT JOIN student_availability sa ON s.id = sa.student_id
  WHERE sa.id IS NULL
)
-- Insert empty availability records for students who don't have any
INSERT INTO student_availability (student_id, week_start, notes)
SELECT 
  swa.student_id,
  ws.week_start::date,
  '{}' -- Empty JSON object as notes
FROM students_without_availability swa
CROSS JOIN week_starts ws
ON CONFLICT (student_id, week_start) DO NOTHING;

-- Verify the fix by checking how many availability records each student now has
SELECT 
  s.id,
  s.first_name,
  s.last_name,
  s.instructor_id,
  COUNT(sa.id) as availability_records
FROM students s
LEFT JOIN student_availability sa ON s.id = sa.student_id
GROUP BY s.id, s.first_name, s.last_name, s.instructor_id
ORDER BY s.first_name, s.last_name; 