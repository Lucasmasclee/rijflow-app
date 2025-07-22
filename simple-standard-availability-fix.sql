-- Simple Standard Availability Fix
-- This script ensures the standard_availability table exists

-- Create standard_availability table if it doesn't exist
CREATE TABLE IF NOT EXISTS standard_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  availability_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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

-- Add default standard availability for instructors who don't have it
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

-- Show results
SELECT 
  'standard_availability' as table_name,
  (SELECT COUNT(*) FROM standard_availability) as record_count
UNION ALL
SELECT 
  'instructor_availability' as table_name,
  (SELECT COUNT(*) FROM instructor_availability) as record_count
ORDER BY table_name; 