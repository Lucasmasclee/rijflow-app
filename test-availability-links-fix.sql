-- ============================================================================
-- TEST AVAILABILITY LINKS RLS FIX
-- ============================================================================
-- Dit script test of de RLS fix voor availability_links werkt

-- ============================================================================
-- STAP 1: TEST CREATE_AVAILABILITY_LINK FUNCTION
-- ============================================================================

-- Test de functie met een bestaande student
SELECT 
  'Testing create_availability_link function with real student' as test_type,
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  create_availability_link(s.id, CURRENT_DATE) as generated_token
FROM students s
ORDER BY s.first_name, s.last_name
LIMIT 3;

-- ============================================================================
-- STAP 2: VERIFICATIE VAN GEGENEREERDE LINKS
-- ============================================================================

-- Controleer of de links correct zijn aangemaakt
SELECT 
  'Verification of generated links' as check_type,
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  al.week_start,
  al.token,
  al.expires_at,
  'https://rijflow.nl/beschikbaarheid/' || al.token as full_url
FROM students s
JOIN availability_links al ON s.id = al.student_id
WHERE al.week_start = CURRENT_DATE
ORDER BY s.first_name, s.last_name;

-- ============================================================================
-- STAP 3: TEST RLS POLICIES
-- ============================================================================

-- Toon alle policies voor availability_links
SELECT 
  'RLS Policies status' as check_type,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'availability_links'
ORDER BY policyname;

-- ============================================================================
-- STAP 4: TEST FUNCTION SECURITY
-- ============================================================================

-- Controleer de security type van de functie
SELECT 
  'Function security check' as check_type,
  routine_name,
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_availability_link'
  AND routine_schema = 'public';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- ✅ Availability Links RLS Fix Test voltooid!
-- 
-- Als alle tests succesvol zijn, dan werkt de SMS functionaliteit weer.
-- De create_availability_link functie kan nu RLS omzeilen en links aanmaken
-- voor alle leerlingen, ongeacht de authenticatie context. 