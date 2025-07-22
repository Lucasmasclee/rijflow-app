-- Debug script to find the student ID mismatch
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STAP 1: CONTROLEER ALLE STUDENTEN VOOR DE INSTRUCTEUR
-- ============================================================================

-- Toon alle studenten voor de instructeur
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
-- STAP 2: CONTROLEER ALLE STUDENT_AVAILABILITY RECORDS VOOR WEEK 2025-07-28
-- ============================================================================

-- Toon ALLE student_availability records voor week 2025-07-28 (ongeacht student_id)
SELECT 
  sa.id,
  sa.student_id,
  sa.week_start,
  sa.availability_data,
  sa.created_at,
  s.first_name,
  s.last_name,
  s.instructor_id
FROM student_availability sa
LEFT JOIN students s ON sa.student_id = s.id
WHERE sa.week_start = '2025-07-28'::date
ORDER BY s.first_name, s.last_name;

-- ============================================================================
-- STAP 3: CONTROLEER OF DE STUDENT_ID IN STUDENT_AVAILABILITY BESTAAT IN STUDENTS
-- ============================================================================

-- Toon student_availability records waarvan de student_id NIET bestaat in students tabel
SELECT 
  sa.id,
  sa.student_id,
  sa.week_start,
  sa.availability_data,
  sa.created_at
FROM student_availability sa
LEFT JOIN students s ON sa.student_id = s.id
WHERE sa.week_start = '2025-07-28'::date
  AND s.id IS NULL;

-- ============================================================================
-- STAP 4: CONTROLEER OF DE STUDENT VAN DE INSTRUCTEUR IS
-- ============================================================================

-- Toon student_availability records voor week 2025-07-28 met student informatie
SELECT 
  sa.id,
  sa.student_id,
  sa.week_start,
  sa.availability_data,
  sa.created_at,
  s.first_name,
  s.last_name,
  s.instructor_id,
  CASE 
    WHEN s.instructor_id = '8df035b4-b84c-41da-b5fb-6e786cbe022c' THEN 'CORRECT INSTRUCTEUR'
    WHEN s.instructor_id IS NULL THEN 'GEEN STUDENT GEVONDEN'
    ELSE 'VERKEERDE INSTRUCTEUR: ' || s.instructor_id
  END as status
FROM student_availability sa
LEFT JOIN students s ON sa.student_id = s.id
WHERE sa.week_start = '2025-07-28'::date
ORDER BY s.first_name, s.last_name;

-- ============================================================================
-- STAP 5: CONTROLEER OF ER DUPLICATE STUDENT_IDS ZIJN
-- ============================================================================

-- Controleer of er duplicate student_ids zijn in de students tabel
SELECT 
  id,
  COUNT(*) as count
FROM students
GROUP BY id
HAVING COUNT(*) > 1;

-- ============================================================================
-- STAP 6: CONTROLEER OF ER DUPLICATE STUDENT_AVAILABILITY RECORDS ZIJN
-- ============================================================================

-- Controleer of er duplicate student_availability records zijn
SELECT 
  student_id,
  week_start,
  COUNT(*) as count
FROM student_availability
WHERE week_start = '2025-07-28'::date
GROUP BY student_id, week_start
HAVING COUNT(*) > 1; 