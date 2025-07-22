-- Fix availability tables structure for AI schedule
-- IMPORTANT: Run this in your Supabase SQL editor to fix the RLS policy error

-- ============================================================================
-- STEP 1: FIX STUDENT_AVAILABILITY TABLE
-- ============================================================================

-- Drop the old student_availability table if it exists
DROP TABLE IF EXISTS student_availability CASCADE;

-- Create new student_availability table with JSONB structure
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

-- Create indexes for better performance
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
-- STEP 2: FIX INSTRUCTOR_AVAILABILITY TABLE
-- ============================================================================

-- Drop the old table if it exists (this will also drop all data)
DROP TABLE IF EXISTS instructor_availability CASCADE;

-- Create new instructor_availability table with JSONB structure
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

-- Create indexes for better performance
CREATE INDEX idx_instructor_availability_instructor_id ON instructor_availability(instructor_id);
CREATE INDEX idx_instructor_availability_week_start ON instructor_availability(week_start);
CREATE INDEX idx_instructor_availability_json ON instructor_availability USING GIN (availability_data);
CREATE INDEX idx_instructor_availability_settings ON instructor_availability USING GIN (settings);

-- ============================================================================
-- STEP 3: ENABLE RLS AND CREATE POLICIES
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;

-- Policy: instructeur mag eigen beschikbaarheid beheren
CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
  FOR ALL USING (auth.uid() = instructor_id);

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Functie om week datums te genereren
CREATE OR REPLACE FUNCTION get_week_dates(p_week_start DATE) RETURNS JSONB AS $$
DECLARE
  week_dates JSONB;
  current_date_var DATE;
BEGIN
  week_dates := '[]'::jsonb;
  
  FOR i IN 0..6 LOOP
    current_date_var := p_week_start + (i || ' days')::interval;
    week_dates := week_dates || to_jsonb(current_date_var::text);
  END LOOP;
  
  RETURN week_dates;
END;
$$ LANGUAGE plpgsql;

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

-- ============================================================================
-- STEP 5: VERIFICATION
-- ============================================================================

-- Test the table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'instructor_availability'
ORDER BY ordinal_position;

-- Test the RLS policies
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
-- COMPLETION MESSAGE
-- ============================================================================

-- This script has successfully:
-- 1. Fixed student_availability table with JSONB structure
-- 2. Fixed instructor_availability table with JSONB structure
-- 3. Enabled RLS with proper policies for both tables
-- 4. Created helper functions for AI weekplanning
-- 5. Added performance indexes for both tables

-- The tables now support:
-- - Week-based availability (one record per student/instructor per week)
-- - JSONB storage for availability_data and settings
-- - Proper RLS policies for instructor and student access
-- - Helper functions for AI weekplanning conversion

-- You can now use the AI schedule feature without RLS policy errors. 