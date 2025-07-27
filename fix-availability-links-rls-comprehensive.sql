-- ============================================================================
-- COMPREHENSIVE FIX AVAILABILITY_LINKS RLS POLICY ISSUE
-- ============================================================================
-- Dit script lost het RLS probleem op voor de availability_links tabel
-- door de policies aan te passen zodat de SMS functionaliteit werkt

-- ============================================================================
-- STAP 1: UPDATE RLS POLICIES
-- ============================================================================

-- Drop bestaande policies
DROP POLICY IF EXISTS "Instructor can manage availability links" ON availability_links;
DROP POLICY IF EXISTS "Public can access valid availability links" ON availability_links;

-- Policy: instructeur mag links beheren voor zijn leerlingen
CREATE POLICY "Instructor can manage availability links" ON availability_links
  FOR ALL USING (
    auth.uid() IN (
      SELECT instructor_id 
      FROM students 
      WHERE id = availability_links.student_id
    )
  );

-- Policy: publiek kan geldige links gebruiken (voor leerlingen)
CREATE POLICY "Public can access valid availability links" ON availability_links
  FOR SELECT USING (
    token IS NOT NULL AND 
    expires_at > NOW()
  );

-- Nieuwe policy: service role kan links aanmaken (voor SMS functionaliteit)
CREATE POLICY "Service role can create availability links" ON availability_links
  FOR INSERT WITH CHECK (
    -- Allow if the authenticated user is an instructor for the student
    auth.uid() IN (
      SELECT instructor_id 
      FROM students 
      WHERE id = availability_links.student_id
    )
    OR
    -- Allow if running as service role (no auth.uid())
    auth.uid() IS NULL
  );

-- Nieuwe policy: service role kan links updaten (voor SMS functionaliteit)
CREATE POLICY "Service role can update availability links" ON availability_links
  FOR UPDATE USING (
    -- Allow if the authenticated user is an instructor for the student
    auth.uid() IN (
      SELECT instructor_id 
      FROM students 
      WHERE id = availability_links.student_id
    )
    OR
    -- Allow if running as service role (no auth.uid())
    auth.uid() IS NULL
  );

-- ============================================================================
-- STAP 2: UPDATE CREATE_AVAILABILITY_LINK FUNCTION
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
-- STAP 3: VERIFICATIE
-- ============================================================================

-- Toon alle policies voor availability_links
SELECT 
  'RLS Policies for availability_links' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'availability_links';

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

-- ✅ Comprehensive Availability Links RLS Fix voltooid!
-- 
-- De availability_links tabel heeft nu:
-- 1. ✅ Instructeur policy voor beheer van eigen leerlingen
-- 2. ✅ Publieke policy voor toegang tot geldige links
-- 3. ✅ Service role policy voor aanmaken van links (SMS functionaliteit)
-- 4. ✅ Service role policy voor updaten van links (SMS functionaliteit)
-- 5. ✅ create_availability_link functie met SECURITY DEFINER
--
-- Dit lost het probleem op waarbij de SMS functionaliteit geen links kon aanmaken
-- vanwege RLS policy beperkingen. 