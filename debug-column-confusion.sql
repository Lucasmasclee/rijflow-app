-- Debug script to check for column confusion between id and student_id
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STAP 1: CONTROLEER STUDENT_AVAILABILITY TABEL STRUCTUUR
-- ============================================================================

-- Toon de kolommen van de student_availability tabel
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'student_availability'
ORDER BY ordinal_position;

-- ============================================================================
-- STAP 2: CONTROLEER STUDENTS TABEL STRUCTUUR
-- ============================================================================

-- Toon de kolommen van de students tabel
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'students'
ORDER BY ordinal_position;

-- ============================================================================
-- STAP 3: CONTROLEER OF ER VERWARRING IS TUSSEN ID EN STUDENT_ID
-- ============================================================================

-- Toon alle student_availability records met student informatie
SELECT 
  sa.id as availability_id,
  sa.student_id,
  s.id as student_table_id,
  s.first_name,
  s.last_name,
  s.instructor_id,
  sa.week_start,
  CASE 
    WHEN sa.student_id = s.id THEN 'MATCH'
    ELSE 'MISMATCH'
  END as id_match
FROM student_availability sa
LEFT JOIN students s ON sa.student_id = s.id
WHERE sa.week_start = '2025-07-28'::date
ORDER BY s.first_name, s.last_name;

-- ============================================================================
-- STAP 4: CONTROLEER SPECIFIEKE STUDENT
-- ============================================================================

-- Controleer de specifieke student uit de screenshot
SELECT 
  'Student from screenshot' as description,
  '8bed064d-1977-4115-bcd1-7933535a7e2e' as student_id_from_availability,
  s.id as student_id_from_students_table,
  s.first_name,
  s.last_name,
  s.instructor_id,
  CASE 
    WHEN '8bed064d-1977-4115-bcd1-7933535a7e2e' = s.id THEN 'MATCH'
    ELSE 'MISMATCH'
  END as id_match
FROM students s
WHERE s.first_name = 'Emma' 
  AND s.last_name = 'de Vries'
  AND s.instructor_id = '8df035b4-b84c-41da-b5fb-6e786cbe022c';

-- ============================================================================
-- STAP 5: CONTROLEER ALLE STUDENTEN VOOR DE INSTRUCTEUR
-- ============================================================================

-- Toon alle studenten voor de instructeur met hun IDs
SELECT 
  id,
  first_name,
  last_name,
  instructor_id,
  created_at
FROM students 
WHERE instructor_id = '8df035b4-b84c-41da-b5fb-6e786cbe022c'
ORDER BY first_name, last_name;

-- ============================================================================
-- STAP 6: CONTROLEER OF DE STUDENT_ID IN AVAILABILITY BESTAAT IN STUDENTS
-- ============================================================================

-- Controleer of de student_id uit de screenshot bestaat in de students tabel
SELECT 
  'Checking if student_id exists in students table' as description,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM students 
      WHERE id = '8bed064d-1977-4115-bcd1-7933535a7e2e'
    ) THEN 'EXISTS'
    ELSE 'NOT FOUND'
  END as status;

-- ============================================================================
-- STAP 7: CONTROLEER OF ER MEERDERE STUDENTEN ZIJN MET DEZELFDE NAAM
-- ============================================================================

-- Controleer of er meerdere studenten zijn met de naam "Emma de Vries"
SELECT 
  id,
  first_name,
  last_name,
  instructor_id,
  created_at
FROM students 
WHERE first_name = 'Emma' 
  AND last_name = 'de Vries'
ORDER BY created_at;

-- ============================================================================
-- STAP 8: CONTROLEER OF ER DUPLICATE STUDENT_IDS ZIJN IN STUDENT_AVAILABILITY
-- ============================================================================

-- Controleer of er duplicate student_ids zijn in student_availability
SELECT 
  student_id,
  COUNT(*) as count,
  array_agg(week_start) as weeks
FROM student_availability
GROUP BY student_id
HAVING COUNT(*) > 1
ORDER BY count DESC; 