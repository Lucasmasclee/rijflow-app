-- ============================================================================
-- NIEUWE BESCHIKBAARHEID SYSTEEM VOOR AI-WEEKPLANNING
-- ============================================================================
-- Dit script herstructureert het hele beschikbaarheid systeem zodat het
-- veel makkelijker te converteren is naar de JSON structuur voor AI-weekplanning

-- ============================================================================
-- STAP 1: NIEUWE STUDENT_AVAILABILITY TABEL
-- ============================================================================

-- Drop de oude tabel als deze bestaat
DROP TABLE IF EXISTS student_availability CASCADE;

-- Maak nieuwe student_availability tabel met JSON structuur
CREATE TABLE student_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL, -- maandag van de week
  availability_data JSONB NOT NULL DEFAULT '{}', -- JSON structuur voor beschikbaarheid per dag
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Zorg ervoor dat er maar één record per student per week is
  UNIQUE(student_id, week_start)
);

-- Maak indexes voor betere performance
CREATE INDEX idx_student_availability_student_id ON student_availability(student_id);
CREATE INDEX idx_student_availability_week_start ON student_availability(week_start);
CREATE INDEX idx_student_availability_json ON student_availability USING GIN (availability_data);

-- Enable RLS
ALTER TABLE student_availability ENABLE ROW LEVEL SECURITY;

-- Policies voor student_availability
DROP POLICY IF EXISTS "Student can manage own availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can view student availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can manage student availability" ON student_availability;

-- Policy: student mag eigen beschikbaarheid lezen/schrijven
CREATE POLICY "Student can manage own availability" ON student_availability
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id 
      FROM students 
      WHERE id = student_availability.student_id
    )
  );

-- Policy: instructeur mag beschikbaarheid van zijn leerlingen lezen
CREATE POLICY "Instructor can view student availability" ON student_availability
  FOR SELECT USING (
    auth.uid() IN (
      SELECT instructor_id 
      FROM students 
      WHERE id = student_availability.student_id
    )
  );

-- Policy: instructeur mag beschikbaarheid van zijn leerlingen beheren
CREATE POLICY "Instructor can manage student availability" ON student_availability
  FOR ALL USING (
    auth.uid() IN (
      SELECT instructor_id 
      FROM students 
      WHERE id = student_availability.student_id
    )
  );

-- ============================================================================
-- STAP 2: NIEUWE INSTRUCTOR_AVAILABILITY TABEL
-- ============================================================================

-- Drop de oude tabel als deze bestaat
DROP TABLE IF EXISTS instructor_availability CASCADE;

-- Maak nieuwe instructor_availability tabel met JSON structuur
CREATE TABLE instructor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL, -- maandag van de week
  availability_data JSONB NOT NULL DEFAULT '{}', -- JSON structuur voor beschikbaarheid per dag
  settings JSONB NOT NULL DEFAULT '{}', -- AI instellingen (maxLessenPerDag, pauzeTussenLessen, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Zorg ervoor dat er maar één record per instructeur per week is
  UNIQUE(instructor_id, week_start)
);

-- Maak indexes voor betere performance
CREATE INDEX idx_instructor_availability_instructor_id ON instructor_availability(instructor_id);
CREATE INDEX idx_instructor_availability_week_start ON instructor_availability(week_start);
CREATE INDEX idx_instructor_availability_json ON instructor_availability USING GIN (availability_data);
CREATE INDEX idx_instructor_availability_settings ON instructor_availability USING GIN (settings);

-- Enable RLS
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;

-- Policies voor instructor_availability
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;

-- Policy: instructeur mag eigen beschikbaarheid beheren
CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
  FOR ALL USING (auth.uid() = instructor_id);

-- ============================================================================
-- STAP 3: HELPER FUNCTIES VOOR JSON CONVERSIE
-- ============================================================================

-- Functie om beschikbaarheid te converteren naar AI-weekplanning formaat
CREATE OR REPLACE FUNCTION get_ai_weekplanning_data(
  p_instructor_id UUID,
  p_week_start DATE
) RETURNS JSONB AS $$
DECLARE
  instructor_data JSONB;
  students_data JSONB;
  result JSONB;
BEGIN
  -- Haal instructeur data op
  SELECT 
    jsonb_build_object(
      'beschikbareUren', availability_data,
      'datums', get_week_dates(p_week_start),
      'maxLessenPerDag', COALESCE((settings->>'maxLessenPerDag')::int, 6),
      'blokuren', COALESCE((settings->>'blokuren')::boolean, true),
      'pauzeTussenLessen', COALESCE((settings->>'pauzeTussenLessen')::int, 10),
      'langePauzeDuur', COALESCE((settings->>'langePauzeDuur')::int, 0),
      'locatiesKoppelen', COALESCE((settings->>'locatiesKoppelen')::boolean, true)
    )
  INTO instructor_data
  FROM instructor_availability
  WHERE instructor_id = p_instructor_id AND week_start = p_week_start;
  
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

-- Functie om week datums te genereren
CREATE OR REPLACE FUNCTION get_week_dates(p_week_start DATE) RETURNS JSONB AS $$
DECLARE
  week_dates JSONB;
  current_date_var DATE;
BEGIN
  week_dates := '[]'::jsonb;
  current_date_var := p_week_start;
  
  -- Genereer 7 datums (maandag tot zondag)
  FOR i IN 0..6 LOOP
    week_dates := week_dates || to_jsonb(current_date_var::text);
    current_date_var := current_date_var + INTERVAL '1 day';
  END LOOP;
  
  RETURN week_dates;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STAP 4: MIGRATIE VAN OUDE DATA (OPTIONEEL)
-- ============================================================================

-- Deze sectie kan later worden uitgevoerd om oude data te migreren
-- Voor nu laten we de nieuwe structuur leeg beginnen

-- ============================================================================
-- STAP 5: VOORBEELD DATA VOOR TESTING
-- ============================================================================

-- Voeg voorbeeld instructeur beschikbaarheid toe (alleen als er instructeurs zijn)
INSERT INTO instructor_availability (instructor_id, week_start, availability_data, settings)
SELECT 
  id,
  date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day',
  '{
    "maandag": ["09:00", "17:00"],
    "dinsdag": ["09:00", "17:00"],
    "woensdag": ["09:00", "13:00"],
    "donderdag": ["09:00", "17:00"],
    "vrijdag": ["13:00", "17:00"],
    "zaterdag": ["09:00", "17:00"]
  }'::jsonb,
  '{
    "maxLessenPerDag": 6,
    "blokuren": true,
    "pauzeTussenLessen": 10,
    "langePauzeDuur": 0,
    "locatiesKoppelen": true
  }'::jsonb
FROM auth.users
WHERE id IN (SELECT DISTINCT instructor_id FROM students WHERE instructor_id IS NOT NULL)
ON CONFLICT (instructor_id, week_start) DO NOTHING;

-- Voeg voorbeeld student beschikbaarheid toe
INSERT INTO student_availability (student_id, week_start, availability_data)
SELECT 
  s.id,
  date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day',
  '{
    "maandag": ["09:00", "17:00"],
    "woensdag": ["10:00", "16:00"],
    "vrijdag": ["08:00", "18:00"]
  }'::jsonb
FROM students s
WHERE s.instructor_id IS NOT NULL
ON CONFLICT (student_id, week_start) DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Het nieuwe beschikbaarheid systeem is succesvol opgezet!
-- 
-- Belangrijke kenmerken:
-- 1. JSONB structuur voor flexibele beschikbaarheid opslag
-- 2. Één rij per student/instructeur per week
-- 3. Makkelijke conversie naar AI-weekplanning formaat
-- 4. Helper functies voor data extractie
-- 5. Volledige RLS policies voor beveiliging
-- 
-- Gebruik de get_ai_weekplanning_data() functie om data te converteren
-- naar het formaat dat generate_week_planning.js verwacht. 