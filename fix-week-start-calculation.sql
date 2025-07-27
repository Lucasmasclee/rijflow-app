-- ============================================================================
-- FIX WEEK_START CALCULATION FOR MONDAY AS FIRST DAY OF WEEK
-- ============================================================================
-- Dit script lost het probleem op waarbij zondag wordt gezien als de eerste dag
-- van de week in plaats van maandag. Het zorgt ervoor dat week_start correct
-- wordt berekend als de maandag van de week.

-- ============================================================================
-- STAP 1: TOON HUIDIGE SITUATIE
-- ============================================================================

-- Toon huidige week_start waarden in availability_links
SELECT 
  'Current availability_links week_start values' as info,
  COUNT(*) as total_links,
  MIN(week_start) as earliest_week,
  MAX(week_start) as latest_week
FROM availability_links;

-- Toon voorbeeld van huidige week_start waarden
SELECT 
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  al.week_start,
  to_char(al.week_start, 'Day') as day_of_week,
  EXTRACT(DOW FROM al.week_start) as day_number
FROM availability_links al
JOIN students s ON al.student_id = s.id
ORDER BY al.week_start, s.first_name
LIMIT 10;

-- ============================================================================
-- STAP 2: TOON HUIDIGE SITUATIE VOOR STUDENT_AVAILABILITY
-- ============================================================================

-- Toon huidige week_start waarden in student_availability
SELECT 
  'Current student_availability week_start values' as info,
  COUNT(*) as total_records,
  MIN(week_start) as earliest_week,
  MAX(week_start) as latest_week
FROM student_availability;

-- Toon voorbeeld van huidige week_start waarden
SELECT 
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  sa.week_start,
  to_char(sa.week_start, 'Day') as day_of_week,
  EXTRACT(DOW FROM sa.week_start) as day_number
FROM student_availability sa
JOIN students s ON sa.student_id = s.id
ORDER BY sa.week_start, s.first_name
LIMIT 10;

-- ============================================================================
-- STAP 3: CORRECTE WEEK_START BEREKENING
-- ============================================================================

-- Functie om de correcte maandag van een week te berekenen
CREATE OR REPLACE FUNCTION get_monday_of_week(input_date DATE) 
RETURNS DATE AS $$
BEGIN
  -- EXTRACT(DOW FROM date) geeft 0 voor zondag, 1 voor maandag, etc.
  -- We willen maandag als dag 1 van de week
  -- Als het zondag is (dag 0), dan willen we de volgende maandag (+1 dag)
  -- Als het maandag is (dag 1), dan willen we deze maandag (+0 dagen)
  -- Als het dinsdag is (dag 2), dan willen we de vorige maandag (-1 dag)
  -- etc.
  RETURN input_date + (1 - EXTRACT(DOW FROM input_date)::int);
END;
$$ LANGUAGE plpgsql;

-- Test de functie
SELECT 
  'Testing get_monday_of_week function' as test_type,
  CURRENT_DATE as today,
  to_char(CURRENT_DATE, 'Day') as today_day,
  get_monday_of_week(CURRENT_DATE) as calculated_monday,
  to_char(get_monday_of_week(CURRENT_DATE), 'Day') as calculated_monday_day;

-- ============================================================================
-- STAP 4: UPDATE AVAILABILITY_LINKS MET CORRECTE WEEK_START
-- ============================================================================

-- Update alle availability_links met de correcte week_start
UPDATE availability_links 
SET week_start = get_monday_of_week(week_start)
WHERE week_start != get_monday_of_week(week_start);

-- Toon resultaat van de update
SELECT 
  'Updated availability_links week_start values' as info,
  COUNT(*) as total_links,
  MIN(week_start) as earliest_week,
  MAX(week_start) as latest_week
FROM availability_links;

-- ============================================================================
-- STAP 5: UPDATE STUDENT_AVAILABILITY MET CORRECTE WEEK_START
-- ============================================================================

-- Update alle student_availability met de correcte week_start
UPDATE student_availability 
SET week_start = get_monday_of_week(week_start)
WHERE week_start != get_monday_of_week(week_start);

-- Toon resultaat van de update
SELECT 
  'Updated student_availability week_start values' as info,
  COUNT(*) as total_records,
  MIN(week_start) as earliest_week,
  MAX(week_start) as latest_week
FROM student_availability;

-- ============================================================================
-- STAP 6: VERIFICATIE
-- ============================================================================

-- Controleer dat alle week_start waarden nu maandag zijn
SELECT 
  'Verification: All week_start values should be Monday' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN EXTRACT(DOW FROM week_start) = 1 THEN 1 END) as monday_records,
  COUNT(CASE WHEN EXTRACT(DOW FROM week_start) != 1 THEN 1 END) as non_monday_records
FROM availability_links;

SELECT 
  'Verification: All week_start values should be Monday' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN EXTRACT(DOW FROM week_start) = 1 THEN 1 END) as monday_records,
  COUNT(CASE WHEN EXTRACT(DOW FROM week_start) != 1 THEN 1 END) as non_monday_records
FROM student_availability;

-- Toon voorbeeld van gecorrigeerde week_start waarden
SELECT 
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  al.week_start,
  to_char(al.week_start, 'Day') as day_of_week,
  EXTRACT(DOW FROM al.week_start) as day_number
FROM availability_links al
JOIN students s ON al.student_id = s.id
ORDER BY al.week_start, s.first_name
LIMIT 10;

-- ============================================================================
-- STAP 7: UPDATE SQL SCRIPTS VOOR TOEKOMSTIGE GEBRUIK
-- ============================================================================

-- Toon de correcte formule voor toekomstige SQL scripts
SELECT 
  'Correct week_start calculation for future use:' as info,
  'input_date + (1 - EXTRACT(DOW FROM input_date)::int)' as formula,
  'This ensures Monday is always day 1 of the week' as explanation;

-- Voorbeeld met huidige datum
SELECT 
  'Example with current date:' as example_type,
  CURRENT_DATE as input_date,
  CURRENT_DATE + (1 - EXTRACT(DOW FROM CURRENT_DATE)::int) as calculated_monday,
  to_char(CURRENT_DATE + (1 - EXTRACT(DOW FROM CURRENT_DATE)::int), 'Day') as day_name; 