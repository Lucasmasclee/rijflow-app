-- ============================================================================
-- SETUP STANDARD AVAILABILITY TABLE
-- ============================================================================
-- Dit script creëert de standard_availability tabel en migreert bestaande data

-- Voer dit script uit in je Supabase SQL editor

-- ============================================================================
-- STAP 1: CREATE STANDARD_AVAILABILITY TABLE
-- ============================================================================

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
-- STAP 2: MIGREER BESTAANDE INSTRUCTEUR DATA
-- ============================================================================

-- Migreer data van de oude instructor_availability tabel naar standard_availability
-- (alleen als de oude tabel nog bestaat)
DO $$
DECLARE
  instructor_record RECORD;
  availability_data JSONB;
  day_names TEXT[] := ARRAY['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  day_name TEXT;
BEGIN
  -- Controleer of de oude tabel bestaat
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'instructor_availability') THEN
    -- Loop door alle instructeurs
    FOR instructor_record IN 
      SELECT DISTINCT instructor_id 
      FROM instructor_availability 
      WHERE instructor_id IS NOT NULL
    LOOP
      -- Maak beschikbaarheid data voor deze instructeur
      availability_data := '{}'::jsonb;
      
      -- Loop door alle dagen
      FOR i IN 0..6 LOOP
        day_name := day_names[i + 1];
        
        -- Haal beschikbaarheid op voor deze dag
        SELECT 
          CASE 
            WHEN available THEN 
              jsonb_build_object(
                day_name, 
                ARRAY[COALESCE(start_time::text, '09:00'), COALESCE(end_time::text, '17:00')]
              )
            ELSE '{}'::jsonb
          END
        INTO availability_data
        FROM instructor_availability 
        WHERE instructor_id = instructor_record.instructor_id 
          AND day_of_week = i
        LIMIT 1;
        
        -- Voeg toe aan totale beschikbaarheid als de dag beschikbaar is
        IF availability_data != '{}'::jsonb THEN
          -- Voeg toe aan bestaande data
          SELECT availability_data || (
            SELECT jsonb_build_object(
              day_name, 
              ARRAY[COALESCE(start_time::text, '09:00'), COALESCE(end_time::text, '17:00')]
            )
            FROM instructor_availability 
            WHERE instructor_id = instructor_record.instructor_id 
              AND day_of_week = i
              AND available = true
            LIMIT 1
          )
          INTO availability_data;
        END IF;
      END LOOP;
      
      -- Voeg toe aan standard_availability
      INSERT INTO standard_availability (instructor_id, availability_data)
      VALUES (instructor_record.instructor_id, availability_data)
      ON CONFLICT (instructor_id) DO UPDATE SET
        availability_data = EXCLUDED.availability_data,
        updated_at = NOW();
        
      RAISE NOTICE 'Migrated data for instructor %', instructor_record.instructor_id;
    END LOOP;
  ELSE
    RAISE NOTICE 'Old instructor_availability table does not exist, skipping migration';
  END IF;
END $$;

-- ============================================================================
-- STAP 3: VOEG STANDAARD BESCHIKBAARHEID TOE VOOR INSTRUCTEURS ZONDER DATA
-- ============================================================================

-- Voeg standaard beschikbaarheid toe voor instructeurs die nog geen standard_availability hebben
INSERT INTO standard_availability (instructor_id, availability_data)
SELECT 
  u.id,
  '{
    "maandag": ["09:00", "17:00"],
    "dinsdag": ["09:00", "17:00"],
    "woensdag": ["09:00", "17:00"],
    "donderdag": ["09:00", "17:00"],
    "vrijdag": ["09:00", "17:00"]
  }'::jsonb
FROM auth.users u
WHERE u.id IN (
  SELECT DISTINCT instructor_id 
  FROM students 
  WHERE instructor_id IS NOT NULL
)
AND u.id NOT IN (
  SELECT instructor_id 
  FROM standard_availability
)
ON CONFLICT (instructor_id) DO NOTHING;

-- ============================================================================
-- STAP 4: VERIFICATION
-- ============================================================================

-- Controleer de tabel structuur
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

-- Toon aantal instructeurs met standard_availability
SELECT 
  COUNT(*) as total_instructors_with_standard_availability
FROM standard_availability;

-- Toon voorbeeld data
SELECT 
  instructor_id,
  availability_data
FROM standard_availability
LIMIT 3; 