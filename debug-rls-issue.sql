-- Debug script voor RLS policy issue
-- Voer dit uit in je Supabase SQL editor om te zien wat er mis gaat

-- ============================================================================
-- STAP 1: CONTROLEER TABEL STRUCTUUR
-- ============================================================================

-- Controleer of de instructor_availability tabel de juiste structuur heeft
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'instructor_availability'
ORDER BY ordinal_position;

-- ============================================================================
-- STAP 2: CONTROLEER RLS POLICIES
-- ============================================================================

-- Controleer alle policies op instructor_availability
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'instructor_availability'
ORDER BY policyname;

-- ============================================================================
-- STAP 3: CONTROLEER OF RLS AAN STAAT
-- ============================================================================

-- Controleer of RLS enabled is op de tabel
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'instructor_availability';

-- ============================================================================
-- STAP 4: TEST HUIDIGE GEBRUIKER
-- ============================================================================

-- Controleer wie de huidige gebruiker is
SELECT 
  'Current user ID' as info,
  auth.uid() as user_id;

-- Controleer of de huidige gebruiker bestaat in auth.users
SELECT 
  'User exists in auth.users' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as user_exists;

-- ============================================================================
-- STAP 5: TEST MANUELE INSERT
-- ============================================================================

-- Probeer een test record toe te voegen (dit zou moeten werken)
-- Vervang 'your-user-id-here' met je eigen user ID
-- Je kunt je user ID vinden door auth.uid() uit te voeren

-- Eerst, haal je user ID op:
SELECT auth.uid() as your_user_id;

-- Dan, probeer een test insert (vervang de UUID met je eigen user ID):
-- INSERT INTO instructor_availability (
--   instructor_id,
--   week_start,
--   availability_data,
--   settings
-- ) VALUES (
--   'your-user-id-here'::uuid,
--   '2025-01-20'::date,
--   '{"maandag": ["09:00", "17:00"]}'::jsonb,
--   '{"maxLessenPerDag": 6}'::jsonb
-- );

-- ============================================================================
-- STAP 6: CONTROLEER BESTAANDE DATA
-- ============================================================================

-- Controleer of er al data in de tabel staat
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT instructor_id) as unique_instructors
FROM instructor_availability;

-- Controleer of er data is voor de huidige gebruiker
SELECT 
  COUNT(*) as records_for_current_user
FROM instructor_availability 
WHERE instructor_id = auth.uid();

-- ============================================================================
-- STAP 7: CONTROLEER HELPER FUNCTIES
-- ============================================================================

-- Controleer of de helper functies bestaan
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_ai_weekplanning_data', 'get_week_dates')
ORDER BY routine_name;

-- Test de get_week_dates functie
SELECT get_week_dates('2025-01-20'::date) as test_week_dates;

-- ============================================================================
-- STAP 8: ALTERNATIEVE RLS POLICY TEST
-- ============================================================================

-- Als de normale policy niet werkt, probeer deze tijdelijke fix:
-- DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;
-- CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
--   FOR ALL USING (auth.uid() IS NOT NULL AND auth.uid() = instructor_id);

-- ============================================================================
-- STAP 9: CONTROLEER AUTH CONTEXT
-- ============================================================================

-- Controleer of de auth context correct is ingesteld
SELECT 
  'Auth context check' as info,
  auth.uid() as current_user_id,
  auth.jwt() ->> 'email' as user_email,
  auth.jwt() ->> 'role' as user_role;

-- ============================================================================
-- STAP 10: TEST ZONDER RLS (TIJDELIJK)
-- ============================================================================

-- Als laatste redmiddel, test zonder RLS (vergeet niet om het later weer aan te zetten!)
-- ALTER TABLE instructor_availability DISABLE ROW LEVEL SECURITY;

-- Test insert zonder RLS:
-- INSERT INTO instructor_availability (
--   instructor_id,
--   week_start,
--   availability_data,
--   settings
-- ) VALUES (
--   auth.uid(),
--   '2025-01-20'::date,
--   '{"maandag": ["09:00", "17:00"]}'::jsonb,
--   '{"maxLessenPerDag": 6}'::jsonb
-- );

-- Zet RLS weer aan:
-- ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY; 