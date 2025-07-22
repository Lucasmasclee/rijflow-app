-- Tijdelijke fix voor RLS policy issue
-- Voer dit uit in je Supabase SQL editor

-- ============================================================================
-- STAP 1: CONTROLEER HUIDIGE SITUATIE
-- ============================================================================

-- Controleer huidige policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'instructor_availability'
ORDER BY policyname;

-- ============================================================================
-- STAP 2: VERWIJDER EN HERMAAK RLS POLICY
-- ============================================================================

-- Verwijder alle bestaande policies
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;

-- Maak een nieuwe, meer permissieve policy
CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
  FOR ALL USING (
    -- Controleer of de gebruiker bestaat en de instructeur is
    auth.uid() IS NOT NULL AND auth.uid() = instructor_id
  );

-- ============================================================================
-- STAP 3: ALTERNATIEVE POLICY (ALS STAP 2 NIET WERKT)
-- ============================================================================

-- Als de bovenstaande policy nog steeds niet werkt, probeer deze meer permissieve versie:
-- DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;
-- CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
--   FOR ALL USING (true);

-- ============================================================================
-- STAP 4: TEST DE POLICY
-- ============================================================================

-- Controleer of de nieuwe policy is aangemaakt
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'instructor_availability'
ORDER BY policyname;

-- ============================================================================
-- STAP 5: MANUELE TEST
-- ============================================================================

-- Test een manuele insert (vervang 'your-user-id' met je eigen user ID)
-- Haal eerst je user ID op:
SELECT auth.uid() as your_user_id;

-- Dan test deze insert (vervang de UUID):
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
-- STAP 6: CONTROLEER TABEL STRUCTUUR
-- ============================================================================

-- Controleer of de tabel de juiste kolommen heeft
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'instructor_availability'
ORDER BY ordinal_position;

-- ============================================================================
-- OPLOSSINGEN VOOR VEELVOORKOMENDE PROBLEMEN
-- ============================================================================

-- Als je nog steeds problemen hebt, probeer deze stappen:

-- 1. Controleer of je ingelogd bent:
-- SELECT auth.uid() as current_user;

-- 2. Controleer of je user bestaat in auth.users:
-- SELECT * FROM auth.users WHERE id = auth.uid();

-- 3. Controleer of RLS aan staat:
-- SELECT rowsecurity FROM pg_tables WHERE tablename = 'instructor_availability';

-- 4. Als laatste redmiddel, schakel RLS tijdelijk uit:
-- ALTER TABLE instructor_availability DISABLE ROW LEVEL SECURITY;
-- (Vergeet niet om het later weer aan te zetten!) 