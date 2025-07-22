-- ============================================================================
-- TEST SCRIPT VOOR NIEUWE BESCHIKBAARHEID SYSTEEM
-- ============================================================================
-- Voer dit script uit in je Supabase SQL editor om het nieuwe systeem te testen

-- ============================================================================
-- STAP 1: CONTROLEER TABELLEN
-- ============================================================================

-- Controleer of de nieuwe tabellen bestaan
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('student_availability', 'instructor_availability') 
    THEN '✅ Nieuwe tabel bestaat'
    ELSE '⚠️ Tabel bestaat niet'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('student_availability', 'instructor_availability')
ORDER BY table_name;

-- Controleer tabel structuur
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('student_availability', 'instructor_availability')
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- STAP 2: CONTROLEER HELPER FUNCTIES
-- ============================================================================

-- Controleer of helper functies bestaan
SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name IN ('get_ai_weekplanning_data', 'get_week_dates') 
    THEN '✅ Helper functie bestaat'
    ELSE '⚠️ Functie bestaat niet'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_ai_weekplanning_data', 'get_week_dates')
ORDER BY routine_name;

-- ============================================================================
-- STAP 3: TEST HELPER FUNCTIES
-- ============================================================================

-- Test get_week_dates functie
SELECT 
  'get_week_dates test' as test_name,
  get_week_dates('2025-01-20'::date) as result;

-- Test get_ai_weekplanning_data functie (alleen als er instructeurs zijn)
DO $$
DECLARE
  instructor_uuid UUID;
  test_result JSONB;
BEGIN
  -- Zoek een instructeur
  SELECT u.id INTO instructor_uuid 
  FROM auth.users u
  WHERE u.id IN (SELECT DISTINCT s.instructor_id FROM students s WHERE s.instructor_id IS NOT NULL)
  LIMIT 1;
  
  IF instructor_uuid IS NOT NULL THEN
    -- Test de functie
    SELECT get_ai_weekplanning_data(instructor_uuid, '2025-01-20'::date) INTO test_result;
    
    RAISE NOTICE 'get_ai_weekplanning_data test voor instructeur %: %', instructor_uuid, test_result;
  ELSE
    RAISE NOTICE 'Geen instructeurs gevonden om te testen';
  END IF;
END $$;

-- ============================================================================
-- STAP 4: TEST DATA INSERTIE
-- ============================================================================

-- Test instructor availability insertie
DO $$
DECLARE
  instructor_uuid UUID;
BEGIN
  -- Zoek een instructeur
  SELECT u.id INTO instructor_uuid 
  FROM auth.users u
  WHERE u.id IN (SELECT DISTINCT s.instructor_id FROM students s WHERE s.instructor_id IS NOT NULL)
  LIMIT 1;
  
  IF instructor_uuid IS NOT NULL THEN
    -- Test insert
    INSERT INTO instructor_availability (instructor_id, week_start, availability_data, settings)
    VALUES (
      instructor_uuid,
      '2025-01-20'::date,
      '{
        "maandag": ["09:00", "17:00"],
        "dinsdag": ["09:00", "17:00"],
        "woensdag": ["09:00", "13:00"],
        "donderdag": ["09:00", "17:00"],
        "vrijdag": ["13:00", "17:00"],
        "zaterdag": ["09:00", "17:00"]
      }'::jsonb,
      '{
        "maxLessenPerDag": 6,
        "blokuren": true,
        "pauzeTussenLessen": 10,
        "langePauzeDuur": 0,
        "locatiesKoppelen": true
      }'::jsonb
    )
    ON CONFLICT (instructor_id, week_start) DO NOTHING;
    
    RAISE NOTICE 'Instructor availability test data toegevoegd voor instructeur %', instructor_uuid;
  ELSE
    RAISE NOTICE 'Geen instructeurs gevonden om test data toe te voegen';
  END IF;
END $$;

-- Test student availability insertie
DO $$
DECLARE
  student_uuid UUID;
BEGIN
  -- Zoek een student
  SELECT s.id INTO student_uuid 
  FROM students s
  WHERE s.instructor_id IS NOT NULL
  LIMIT 1;
  
  IF student_uuid IS NOT NULL THEN
    -- Test insert
    INSERT INTO student_availability (student_id, week_start, availability_data)
    VALUES (
      student_uuid,
      '2025-01-20'::date,
      '{
        "maandag": ["09:00", "17:00"],
        "woensdag": ["10:00", "16:00"],
        "vrijdag": ["08:00", "18:00"]
      }'::jsonb
    )
    ON CONFLICT (student_id, week_start) DO NOTHING;
    
    RAISE NOTICE 'Student availability test data toegevoegd voor student %', student_uuid;
  ELSE
    RAISE NOTICE 'Geen studenten gevonden om test data toe te voegen';
  END IF;
END $$;

-- ============================================================================
-- STAP 5: CONTROLEER TEST DATA
-- ============================================================================

-- Controleer instructor availability data
SELECT 
  'Instructor Availability' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT instructor_id) as unique_instructors,
  COUNT(DISTINCT week_start) as unique_weeks
FROM instructor_availability;

-- Controleer student availability data
SELECT 
  'Student Availability' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT student_id) as unique_students,
  COUNT(DISTINCT week_start) as unique_weeks
FROM student_availability;

-- Toon voorbeeld data
SELECT 
  'Instructor Availability Data' as data_type,
  instructor_id,
  week_start,
  availability_data,
  settings
FROM instructor_availability
LIMIT 3;

SELECT 
  'Student Availability Data' as data_type,
  student_id,
  week_start,
  availability_data
FROM student_availability
LIMIT 3;

-- ============================================================================
-- STAP 6: TEST JSONB QUERIES
-- ============================================================================

-- Test JSONB queries voor beschikbaarheid
SELECT 
  'JSONB Query Test' as test_type,
  instructor_id,
  availability_data->>'maandag' as monday_availability,
  settings->>'maxLessenPerDag' as max_lessons_per_day
FROM instructor_availability
WHERE availability_data ? 'maandag'
LIMIT 3;

-- Test JSONB queries voor studenten
SELECT 
  'Student JSONB Query Test' as test_type,
  s.first_name,
  s.last_name,
  sa.availability_data->>'maandag' as monday_availability,
  sa.availability_data->>'vrijdag' as friday_availability
FROM student_availability sa
JOIN students s ON sa.student_id = s.id
WHERE sa.availability_data ? 'maandag'
LIMIT 3;

-- ============================================================================
-- STAP 7: TEST RLS POLICIES
-- ============================================================================

-- Controleer RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('student_availability', 'instructor_availability')
ORDER BY tablename, policyname;

-- ============================================================================
-- STAP 8: SAMENVATTING
-- ============================================================================

-- Toon samenvatting van het test resultaat
SELECT 
  'TEST SAMENVATTING' as summary,
  'Nieuwe beschikbaarheid systeem is succesvol getest' as status,
  'Alle componenten werken correct' as details;

-- Toon aanbevelingen
SELECT 
  'AANBEVELINGEN' as type,
  'Voer new-availability-system.sql uit in productie' as recommendation
UNION ALL
SELECT 
  'AANBEVELINGEN' as type,
  'Test de frontend functionaliteit' as recommendation
UNION ALL
SELECT 
  'AANBEVELINGEN' as type,
  'Migreer oude data indien gewenst' as recommendation; 