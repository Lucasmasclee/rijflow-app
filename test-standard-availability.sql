-- ============================================================================
-- TEST STANDARD AVAILABILITY IMPLEMENTATION
-- ============================================================================
-- Voer dit script uit in je Supabase SQL editor om de implementatie te testen

-- ============================================================================
-- STAP 1: CONTROLEER TABEL STRUCTUUR
-- ============================================================================

-- Controleer of standard_availability tabel bestaat
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'standard_availability' THEN '✅ Standard availability table exists'
    ELSE '⚠️ Other table'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('standard_availability', 'instructor_availability', 'student_availability')
ORDER BY table_name;

-- Controleer standard_availability kolommen
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'standard_availability'
ORDER BY ordinal_position;

-- ============================================================================
-- STAP 2: CONTROLEER RLS POLICIES
-- ============================================================================

-- Controleer RLS policies voor standard_availability
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'standard_availability'
ORDER BY policyname;

-- ============================================================================
-- STAP 3: CONTROLEER DATA
-- ============================================================================

-- Controleer hoeveel instructeurs standard_availability hebben
SELECT 
  COUNT(*) as total_instructors_with_standard_availability
FROM standard_availability;

-- Controleer hoeveel instructeurs instructor_availability hebben
SELECT 
  COUNT(DISTINCT instructor_id) as total_instructors_with_week_availability
FROM instructor_availability;

-- Toon voorbeeld standard_availability data
SELECT 
  instructor_id,
  availability_data,
  created_at,
  updated_at
FROM standard_availability
LIMIT 3;

-- ============================================================================
-- STAP 4: TEST HELPER FUNCTIE
-- ============================================================================

-- Test de get_standard_availability functie
DO $$
DECLARE
  test_instructor_id UUID;
  test_result JSONB;
BEGIN
  -- Zoek een instructeur om te testen
  SELECT instructor_id INTO test_instructor_id
  FROM standard_availability
  LIMIT 1;
  
  IF test_instructor_id IS NOT NULL THEN
    -- Test de functie
    SELECT get_standard_availability(test_instructor_id) INTO test_result;
    
    RAISE NOTICE 'Test instructor ID: %', test_instructor_id;
    RAISE NOTICE 'Standard availability result: %', test_result;
    
    IF test_result IS NOT NULL AND test_result != '{}'::jsonb THEN
      RAISE NOTICE '✅ get_standard_availability function works correctly';
    ELSE
      RAISE NOTICE '⚠️ get_standard_availability function returned empty result';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ No instructors found to test with';
  END IF;
END $$;

-- ============================================================================
-- STAP 5: TEST DATA INTEGRITY
-- ============================================================================

-- Controleer of alle instructeurs met leerlingen ook standard_availability hebben
SELECT 
  COUNT(*) as instructors_without_standard_availability
FROM (
  SELECT DISTINCT instructor_id
  FROM students
  WHERE instructor_id IS NOT NULL
) s
LEFT JOIN standard_availability sa ON s.instructor_id = sa.instructor_id
WHERE sa.instructor_id IS NULL;

-- Controleer of standard_availability data geldig JSON is
SELECT 
  instructor_id,
  CASE 
    WHEN jsonb_typeof(availability_data) = 'object' THEN '✅ Valid JSON object'
    ELSE '❌ Invalid JSON structure'
  END as json_validity
FROM standard_availability
LIMIT 5;

-- ============================================================================
-- STAP 6: TEST FALLBACK LOGIC
-- ============================================================================

-- Simuleer de fallback logic
DO $$
DECLARE
  test_instructor_id UUID;
  standard_data JSONB;
  week_data JSONB;
BEGIN
  -- Zoek een instructeur om te testen
  SELECT instructor_id INTO test_instructor_id
  FROM standard_availability
  LIMIT 1;
  
  IF test_instructor_id IS NOT NULL THEN
    -- Haal standard_availability op
    SELECT availability_data INTO standard_data
    FROM standard_availability
    WHERE instructor_id = test_instructor_id;
    
    -- Haal instructor_availability op voor een specifieke week
    SELECT availability_data INTO week_data
    FROM instructor_availability
    WHERE instructor_id = test_instructor_id
      AND week_start = '2025-01-20'::date;
    
    RAISE NOTICE 'Test instructor ID: %', test_instructor_id;
    RAISE NOTICE 'Standard availability: %', standard_data;
    RAISE NOTICE 'Week availability (2025-01-20): %', week_data;
    
    -- Test fallback logic
    IF week_data IS NULL OR week_data = '{}'::jsonb THEN
      RAISE NOTICE '✅ Fallback logic: Would use standard_availability as fallback';
    ELSE
      RAISE NOTICE '✅ Week-specific data exists, no fallback needed';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ No instructors found to test fallback logic';
  END IF;
END $$;

-- ============================================================================
-- STAP 7: PERFORMANCE CHECKS
-- ============================================================================

-- Controleer of indexes bestaan
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename = 'standard_availability'
ORDER BY indexname;

-- ============================================================================
-- SAMENVATTING
-- ============================================================================

-- Toon samenvatting van alle checks
SELECT 
  'Standard Availability Implementation Test Results' as test_name,
  (SELECT COUNT(*) FROM standard_availability) as instructors_with_standard_availability,
  (SELECT COUNT(DISTINCT instructor_id) FROM instructor_availability) as instructors_with_week_availability,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'standard_availability') as rls_policies_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'standard_availability') as indexes_count; 