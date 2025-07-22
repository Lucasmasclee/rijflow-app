-- Debug script to check student availability records
-- Run this in Supabase SQL Editor to see what's happening

-- ============================================================================
-- STAP 1: CONTROLEER STUDENTEN
-- ============================================================================

-- Toon alle studenten voor de huidige instructeur
SELECT 
  id,
  first_name,
  last_name,
  instructor_id,
  created_at
FROM students 
WHERE instructor_id = '8df035b4-b84c-41da-b5fb-6e786cbe022c'  -- Vervang met jouw instructor_id
ORDER BY first_name, last_name;

-- ============================================================================
-- STAP 2: CONTROLEER STUDENT_AVAILABILITY RECORDS
-- ============================================================================

-- Toon alle student_availability records voor deze instructeur
SELECT 
  sa.id,
  sa.student_id,
  s.first_name,
  s.last_name,
  sa.week_start,
  sa.availability_data,
  sa.created_at
FROM student_availability sa
JOIN students s ON sa.student_id = s.id
WHERE s.instructor_id = '8df035b4-b84c-41da-b5fb-6e786cbe022c'  -- Vervang met jouw instructor_id
ORDER BY s.first_name, s.last_name, sa.week_start;

-- ============================================================================
-- STAP 3: CONTROLEER SPECIFIEKE WEEK
-- ============================================================================

-- Controleer of er records zijn voor week 2025-07-28
SELECT 
  sa.id,
  sa.student_id,
  s.first_name,
  s.last_name,
  sa.week_start,
  sa.availability_data,
  sa.created_at
FROM student_availability sa
JOIN students s ON sa.student_id = s.id
WHERE s.instructor_id = '8df035b4-b84c-41da-b5fb-6e786cbe022c'  -- Vervang met jouw instructor_id
  AND sa.week_start = '2025-07-28'::date
ORDER BY s.first_name, s.last_name;

-- ============================================================================
-- STAP 4: CONTROLEER DATUM FORMATEN
-- ============================================================================

-- Test verschillende datum formaten
SELECT 
  '2025-07-28' as string_date,
  '2025-07-28'::date as cast_date,
  '2025-07-28'::timestamp as cast_timestamp,
  '2025-07-28'::timestamp with time zone as cast_timestamptz;

-- ============================================================================
-- STAP 5: CONTROLEER MISSENDE RECORDS
-- ============================================================================

-- Toon studenten die GEEN availability hebben voor week 2025-07-28
SELECT 
  s.id,
  s.first_name,
  s.last_name,
  s.instructor_id
FROM students s
LEFT JOIN student_availability sa ON s.id = sa.student_id 
  AND sa.week_start = '2025-07-28'::date
WHERE s.instructor_id = '8df035b4-b84c-41da-b5fb-6e786cbe022c'  -- Vervang met jouw instructor_id
  AND sa.id IS NULL
ORDER BY s.first_name, s.last_name;

-- ============================================================================
-- STAP 6: TEST INSERT
-- ============================================================================

-- Test het aanmaken van een record (uncomment om te testen)
/*
INSERT INTO student_availability (student_id, week_start, availability_data)
SELECT 
  s.id,
  '2025-07-28'::date,
  '{"maandag": ["09:00", "17:00"], "dinsdag": ["09:00", "17:00"], "woensdag": ["09:00", "17:00"], "donderdag": ["09:00", "17:00"], "vrijdag": ["09:00", "17:00"]}'::jsonb
FROM students s
WHERE s.instructor_id = '8df035b4-b84c-41da-b5fb-6e786cbe022c'  -- Vervang met jouw instructor_id
  AND s.first_name = 'Emma'  -- Vervang met de naam van de student
  AND s.last_name = 'de Vries'  -- Vervang met de achternaam van de student
ON CONFLICT (student_id, week_start) DO NOTHING;
*/ 