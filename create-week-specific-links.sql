-- ============================================================================
-- CREATE WEEK-SPECIFIC AVAILABILITY LINKS SYSTEM
-- ============================================================================
-- Dit script creëert een systeem voor week-specifieke beschikbaarheid links
-- in plaats van statische links per leerling

-- ============================================================================
-- STAP 1: CREATE AVAILABILITY_LINKS TABLE
-- ============================================================================

-- Drop de tabel als deze bestaat
DROP TABLE IF EXISTS availability_links CASCADE;

-- Maak nieuwe availability_links tabel
CREATE TABLE availability_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL, -- maandag van de week
  token TEXT UNIQUE NOT NULL, -- unieke token voor de link
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- link verloopt na 2 weken
  
  -- Zorg ervoor dat er maar één link per student per week is
  UNIQUE(student_id, week_start)
);

-- Maak indexes voor betere performance
CREATE INDEX idx_availability_links_student_id ON availability_links(student_id);
CREATE INDEX idx_availability_links_week_start ON availability_links(week_start);
CREATE INDEX idx_availability_links_token ON availability_links(token);
CREATE INDEX idx_availability_links_expires_at ON availability_links(expires_at);

-- Enable RLS
ALTER TABLE availability_links ENABLE ROW LEVEL SECURITY;

-- Policies voor availability_links
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

-- ============================================================================
-- STAP 2: HELPER FUNCTIES
-- ============================================================================

-- Functie om een unieke token te genereren
CREATE OR REPLACE FUNCTION generate_availability_token() RETURNS TEXT AS $$
BEGIN
  RETURN 'avail_' || gen_random_uuid()::text;
END;
$$ LANGUAGE plpgsql;

-- Functie om een week-specifieke link te maken
CREATE OR REPLACE FUNCTION create_availability_link(
  p_student_id UUID,
  p_week_start DATE
) RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Genereer unieke token
  v_token := generate_availability_token();
  
  -- Link verloopt na 2 weken
  v_expires_at := NOW() + INTERVAL '14 days';
  
  -- Maak de link aan
  INSERT INTO availability_links (student_id, week_start, token, expires_at)
  VALUES (p_student_id, p_week_start, v_token, v_expires_at)
  ON CONFLICT (student_id, week_start) 
  DO UPDATE SET 
    token = v_token,
    expires_at = v_expires_at;
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STAP 3: CLEANUP OUDE DATA
-- ============================================================================

-- Verwijder oude public_token en public_url kolommen uit students tabel
-- (optioneel - alleen als je zeker weet dat je ze niet meer nodig hebt)
-- ALTER TABLE students DROP COLUMN IF EXISTS public_token;
-- ALTER TABLE students DROP COLUMN IF EXISTS public_url;

-- ============================================================================
-- STAP 4: VERIFICATIE
-- ============================================================================

-- Controleer of de tabel correct is aangemaakt
SELECT 
  'availability_links' as table_name,
  (SELECT COUNT(*) FROM availability_links) as record_count
UNION ALL
SELECT 
  'students' as table_name,
  (SELECT COUNT(*) FROM students) as record_count;

-- Toon de structuur van de nieuwe tabel
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'availability_links'
ORDER BY ordinal_position; 