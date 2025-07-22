-- Fix AI Schedule Standard Availability Error
-- This script ensures the standard_availability table exists and creates a proper fallback mechanism

-- ============================================================================
-- STEP 1: ENSURE STANDARD_AVAILABILITY TABLE EXISTS
-- ============================================================================

-- Create standard_availability table if it doesn't exist
CREATE TABLE IF NOT EXISTS standard_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  availability_data JSONB NOT NULL DEFAULT '{}', -- JSON structuur voor beschikbaarheid per dag
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Zorg ervoor dat er maar één record per instructeur is
  UNIQUE(instructor_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_standard_availability_instructor_id ON standard_availability(instructor_id);
CREATE INDEX IF NOT EXISTS idx_standard_availability_json ON standard_availability USING GIN (availability_data);

-- Enable RLS
ALTER TABLE standard_availability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Instructors can manage their own standard availability" ON standard_availability;

-- Policy: instructeur mag eigen standaard beschikbaarheid beheren
CREATE POLICY "Instructors can manage their own standard availability" ON standard_availability
  FOR ALL USING (auth.uid() = instructor_id);

-- ============================================================================
-- STEP 2: CREATE HELPER FUNCTION FOR STANDARD AVAILABILITY
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
-- STEP 3: UPDATE GET_AI_WEEKPLANNING_DATA FUNCTION WITH BETTER FALLBACK
-- ============================================================================

-- Update the get_ai_weekplanning_data function to handle missing instructor_availability better
CREATE OR REPLACE FUNCTION get_ai_weekplanning_data(
  p_instructor_id UUID,
  p_week_start DATE
) RETURNS JSONB AS $$
DECLARE
  instructor_data JSONB;
  students_data JSONB;
  result JSONB;
  instructor_availability_record RECORD;
  standard_availability_data JSONB;
BEGIN
  -- Haal eerst instructor_availability op voor deze week
  SELECT * INTO instructor_availability_record
  FROM instructor_availability
  WHERE instructor_id = p_instructor_id AND week_start = p_week_start;
  
  -- Als er geen instructor_availability is voor deze week, gebruik standard_availability
  IF instructor_availability_record IS NULL THEN
    -- Haal standard_availability op
    SELECT availability_data INTO standard_availability_data
    FROM standard_availability
    WHERE instructor_id = p_instructor_id;
    
    -- Als er ook geen standard_availability is, gebruik default waarden
    IF standard_availability_data IS NULL OR standard_availability_data = '{}'::jsonb THEN
      standard_availability_data := '{
        "maandag": ["09:00", "17:00"],
        "dinsdag": ["09:00", "17:00"],
        "woensdag": ["09:00", "17:00"],
        "donderdag": ["09:00", "17:00"],
        "vrijdag": ["09:00", "17:00"]
      }'::jsonb;
    END IF;
    
    -- Maak een nieuwe instructor_availability record aan met standard_availability data
    INSERT INTO instructor_availability (instructor_id, week_start, availability_data, settings)
    VALUES (
      p_instructor_id,
      p_week_start,
      standard_availability_data,
      '{
        "maxLessenPerDag": 6,
        "blokuren": true,
        "pauzeTussenLessen": 10,
        "langePauzeDuur": 0,
        "locatiesKoppelen": true
      }'::jsonb
    );
    
    -- Haal de nieuwe record op
    SELECT * INTO instructor_availability_record
    FROM instructor_availability
    WHERE instructor_id = p_instructor_id AND week_start = p_week_start;
  END IF;
  
  -- Haal instructeur data op
  SELECT 
    jsonb_build_object(
      'beschikbareUren', instructor_availability_record.availability_data,
      'datums', get_week_dates(p_week_start),
      'maxLessenPerDag', COALESCE((instructor_availability_record.settings->>'maxLessenPerDag')::int, 6),
      'blokuren', COALESCE((instructor_availability_record.settings->>'blokuren')::boolean, true),
      'pauzeTussenLessen', COALESCE((instructor_availability_record.settings->>'pauzeTussenLessen')::int, 10),
      'langePauzeDuur', COALESCE((instructor_availability_record.settings->>'langePauzeDuur')::int, 0),
      'locatiesKoppelen', COALESCE((instructor_availability_record.settings->>'locatiesKoppelen')::boolean, true)
    )
  INTO instructor_data;
  
  -- Haal studenten data op
  SELECT 
    jsonb_build_object(
      'leerlingen',
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'naam', CASE 
              WHEN s.last_name IS NOT NULL AND s.last_name != '' 
              THEN s.first_name || ' ' || s.last_name 
              ELSE s.first_name 
            END,
            'lessenPerWeek', COALESCE(s.default_lessons_per_week, 2),
            'lesDuur', COALESCE(s.default_lesson_duration_minutes, 60),
            'beschikbaarheid', COALESCE(sa.availability_data, '{}'::jsonb)
          )
        ),
        '[]'::jsonb
      )
    )
  INTO students_data
  FROM students s
  LEFT JOIN student_availability sa ON s.id = sa.student_id AND sa.week_start = p_week_start
  WHERE s.instructor_id = p_instructor_id;
  
  -- Combineer data
  result := instructor_data || students_data;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: ENSURE ALL INSTRUCTORS HAVE STANDARD_AVAILABILITY
-- ============================================================================

-- Voeg standaard beschikbaarheid toe voor instructeurs die nog geen standard_availability hebben
INSERT INTO standard_availability (instructor_id, availability_data)
SELECT 
  DISTINCT s.instructor_id,
  '{
    "maandag": ["09:00", "17:00"],
    "dinsdag": ["09:00", "17:00"],
    "woensdag": ["09:00", "17:00"],
    "donderdag": ["09:00", "17:00"],
    "vrijdag": ["09:00", "17:00"]
  }'::jsonb
FROM students s
WHERE s.instructor_id NOT IN (
  SELECT instructor_id FROM standard_availability
)
ON CONFLICT (instructor_id) DO NOTHING;

-- ============================================================================
-- STEP 5: VERIFICATION
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

-- Toon aantal instructeurs met standard_availability
SELECT 
  COUNT(*) as total_instructors_with_standard_availability
FROM standard_availability;

-- Test de get_ai_weekplanning_data functie met een bestaande instructeur
DO $$
DECLARE
  test_instructor_id UUID;
  test_result JSONB;
BEGIN
  -- Haal een instructeur op die leerlingen heeft
  SELECT instructor_id INTO test_instructor_id
  FROM students
  LIMIT 1;
  
  IF test_instructor_id IS NOT NULL THEN
    -- Test de functie
    SELECT get_ai_weekplanning_data(test_instructor_id, CURRENT_DATE) INTO test_result;
    
    IF test_result IS NOT NULL AND test_result != '{}'::jsonb THEN
      RAISE NOTICE '✅ get_ai_weekplanning_data function works correctly for instructor %', test_instructor_id;
    ELSE
      RAISE NOTICE '⚠️ get_ai_weekplanning_data function returned empty result for instructor %', test_instructor_id;
    END IF;
  ELSE
    RAISE NOTICE '⚠️ No instructors with students found for testing';
  END IF;
END $$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This script has successfully:
-- 1. Ensured the standard_availability table exists with proper structure
-- 2. Created helper functions for standard availability
-- 3. Updated get_ai_weekplanning_data function with automatic fallback
-- 4. Ensured all instructors have standard_availability records
-- 5. Added proper RLS policies

-- The AI schedule feature should now work without the "No data found" error.
-- When an instructor selects a week without existing availability, the system will:
-- 1. Check for instructor_availability for that week
-- 2. If not found, use standard_availability as fallback
-- 3. If no standard_availability, use default values
-- 4. Automatically create a new instructor_availability record 