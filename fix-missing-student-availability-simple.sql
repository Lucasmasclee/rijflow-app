-- Simple fix for missing student availability records
-- This script adds empty availability records for the current week only

-- Calculate the current week start (next Monday)
WITH current_week_start AS (
  SELECT date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day' as week_start
),
students_without_availability AS (
  SELECT DISTINCT s.id as student_id
  FROM students s
  LEFT JOIN student_availability sa ON s.id = sa.student_id 
    AND sa.week_start = (SELECT week_start FROM current_week_start)
  WHERE sa.id IS NULL
)
-- Insert empty availability records for students who don't have any for the current week
INSERT INTO student_availability (student_id, week_start, notes)
SELECT 
  swa.student_id,
  (SELECT week_start FROM current_week_start),
  '{}' -- Empty JSON object as notes
FROM students_without_availability swa
ON CONFLICT (student_id, week_start) DO NOTHING;

-- Show the results
SELECT 
  s.first_name,
  s.last_name,
  sa.week_start,
  sa.notes
FROM students s
LEFT JOIN student_availability sa ON s.id = sa.student_id 
  AND sa.week_start = date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day'
ORDER BY s.first_name, s.last_name; 