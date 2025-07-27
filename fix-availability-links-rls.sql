-- ============================================================================
-- FIX AVAILABILITY_LINKS RLS POLICY ISSUE
-- ============================================================================
-- Dit script lost het RLS probleem op voor de availability_links tabel
-- door de create_availability_link functie toe te staan om RLS te omzeilen

-- ============================================================================
-- STAP 1: UPDATE CREATE_AVAILABILITY_LINK FUNCTION
-- ============================================================================

-- Drop de bestaande functie
DROP FUNCTION IF EXISTS create_availability_link(UUID, DATE);

-- Maak een nieuwe versie van de functie die RLS omzeilt
CREATE OR REPLACE FUNCTION create_availability_link(
  p_student_id UUID,
  p_week_start DATE
) RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Genereer unieke token
  v_token := 'avail_' || gen_random_uuid()::text;
  
  -- Link verloopt na 2 weken
  v_expires_at := NOW() + INTERVAL '14 days';
  
  -- Maak de link aan met SECURITY DEFINER om RLS te omzeilen
  INSERT INTO availability_links (student_id, week_start, token, expires_at)
  VALUES (p_student_id, p_week_start, v_token, v_expires_at)
  ON CONFLICT (student_id, week_start) 
  DO UPDATE SET 
    token = v_token,
    expires_at = v_expires_at;
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STAP 2: VERIFICATIE
-- ============================================================================

-- Test de functie met een echte student ID
SELECT 
  'Testing create_availability_link function' as test_type,
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  create_availability_link(s.id, CURRENT_DATE) as test_result
FROM students s
ORDER BY s.first_name, s.last_name
LIMIT 1;

-- Controleer of de functie correct is aangemaakt
SELECT 
  'Function check' as check_type,
  routine_name,
  security_type
FROM information_schema.routines 
WHERE routine_name = 'create_availability_link'
  AND routine_schema = 'public';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- ✅ Availability Links RLS Fix voltooid!
-- 
-- De create_availability_link functie kan nu RLS omzeilen en links aanmaken
-- voor alle leerlingen, ongeacht de authenticatie context.
--
-- Dit lost het probleem op waarbij de SMS functionaliteit geen links kon aanmaken
-- vanwege RLS policy beperkingen. 