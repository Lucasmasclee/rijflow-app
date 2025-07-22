-- ============================================================================
-- CREATE STANDARD_AVAILABILITY TABLE
-- ============================================================================
-- Deze tabel wordt gebruikt voor de STANDAARD beschikbaarheid van instructeurs
-- en is gekoppeld aan de rooster instellingen pagina

-- Drop de tabel als deze bestaat
DROP TABLE IF EXISTS standard_availability CASCADE;

-- Maak nieuwe standard_availability tabel met JSON structuur
CREATE TABLE standard_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  availability_data JSONB NOT NULL DEFAULT '{}', -- JSON structuur voor beschikbaarheid per dag
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Zorg ervoor dat er maar één record per instructeur is
  UNIQUE(instructor_id)
);

-- Maak indexes voor betere performance
CREATE INDEX idx_standard_availability_instructor_id ON standard_availability(instructor_id);
CREATE INDEX idx_standard_availability_json ON standard_availability USING GIN (availability_data);

-- Enable RLS
ALTER TABLE standard_availability ENABLE ROW LEVEL SECURITY;

-- Policies voor standard_availability
DROP POLICY IF EXISTS "Instructors can manage their own standard availability" ON standard_availability;

-- Policy: instructeur mag eigen standaard beschikbaarheid beheren
CREATE POLICY "Instructors can manage their own standard availability" ON standard_availability
  FOR ALL USING (auth.uid() = instructor_id);

-- ============================================================================
-- HELPER FUNCTIE VOOR STANDARD AVAILABILITY
-- ============================================================================

-- Functie om standaard beschikbaarheid op te halen voor een instructeur
CREATE OR REPLACE FUNCTION get_standard_availability(p_instructor_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT availability_data INTO result
  FROM standard_availability
  WHERE instructor_id = p_instructor_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test de tabel structuur
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'standard_availability'
ORDER BY ordinal_position;

-- Controleer of de policy is aangemaakt
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'standard_availability'
ORDER BY policyname; 