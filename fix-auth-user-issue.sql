-- Fix voor auth user issue - gebruiker bestaat niet in auth.users
-- Voer dit uit in je Supabase SQL editor

-- ============================================================================
-- STAP 1: DIAGNOSE HUIDIGE SITUATIE
-- ============================================================================

-- Controleer of er überhaupt gebruikers zijn in auth.users
SELECT 
  'Total users in auth.users' as info,
  COUNT(*) as count
FROM auth.users;

-- Controleer de huidige auth context
SELECT 
  'Current auth context' as info,
  auth.uid() as current_user_id,
  auth.jwt() ->> 'email' as user_email,
  auth.jwt() ->> 'sub' as user_sub;

-- Controleer of er gebruikers zijn met dezelfde email als de huidige gebruiker
SELECT 
  'Users with same email' as info,
  id,
  email,
  created_at,
  updated_at
FROM auth.users 
WHERE email = auth.jwt() ->> 'email';

-- ============================================================================
-- STAP 2: CONTROLEER AUTH SETUP
-- ============================================================================

-- Controleer of de auth schema correct is ingesteld
SELECT 
  'Auth schema check' as info,
  EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schema_name = 'auth'
  ) as auth_schema_exists;

-- Controleer of de auth.users tabel bestaat
SELECT 
  'Auth users table check' as info,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) as auth_users_table_exists;

-- ============================================================================
-- STAP 3: TIJDELIJKE FIX - SCHAKEL RLS UIT
-- ============================================================================

-- Als tijdelijke oplossing, schakel RLS uit op instructor_availability
-- Dit is NIET veilig voor productie, maar helpt om te testen
ALTER TABLE instructor_availability DISABLE ROW LEVEL SECURITY;

-- Controleer of RLS uit staat
SELECT 
  'RLS status' as info,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'instructor_availability';

-- ============================================================================
-- STAP 4: TEST INSERT ZONDER RLS
-- ============================================================================

-- Probeer een test insert zonder RLS
-- Vervang 'your-email@example.com' met je eigen email
-- en 'your-user-id' met een willekeurige UUID

-- Eerst, maak een test gebruiker aan in auth.users (als die niet bestaat)
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES (
--   gen_random_uuid(),
--   'your-email@example.com',
--   crypt('temp-password', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW()
-- )
-- ON CONFLICT (email) DO NOTHING;

-- Dan probeer een test insert in instructor_availability
-- INSERT INTO instructor_availability (
--   instructor_id,
--   week_start,
--   availability_data,
--   settings
-- ) VALUES (
--   (SELECT id FROM auth.users WHERE email = 'your-email@example.com' LIMIT 1),
--   '2025-01-20'::date,
--   '{"maandag": ["09:00", "17:00"]}'::jsonb,
--   '{"maxLessenPerDag": 6}'::jsonb
-- );

-- ============================================================================
-- STAP 5: ALTERNATIEVE RLS POLICY
-- ============================================================================

-- Als de gebruiker wel bestaat, maak een meer permissieve policy
-- DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;
-- CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
--   FOR ALL USING (
--     -- Controleer of de gebruiker bestaat en de instructeur is
--     auth.uid() IS NOT NULL AND auth.uid() = instructor_id
--   );

-- ============================================================================
-- STAP 6: HERSTEL RLS (NA TESTING)
-- ============================================================================

-- Na het testen, zet RLS weer aan
-- ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STAP 7: CONTROLEER RESULTATEN
-- ============================================================================

-- Controleer of er data is ingevoegd
SELECT 
  'Test data check' as info,
  COUNT(*) as total_records
FROM instructor_availability;

-- Controleer de structuur van de ingevoegde data
SELECT 
  id,
  instructor_id,
  week_start,
  availability_data,
  settings
FROM instructor_availability
LIMIT 5; 