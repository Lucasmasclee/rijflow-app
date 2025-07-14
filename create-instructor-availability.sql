-- Create instructor_availability table for storing standard instructor working days
-- This table stores which days of the week an instructor is normally available

CREATE TABLE IF NOT EXISTS instructor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  available BOOLEAN NOT NULL DEFAULT true,
  start_time TIME DEFAULT '09:00:00', -- Default start time for the day
  end_time TIME DEFAULT '17:00:00',   -- Default end time for the day
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per instructor per day
  UNIQUE(instructor_id, day_of_week)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instructor_availability_instructor_id ON instructor_availability(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_availability_day_of_week ON instructor_availability(day_of_week);

-- Enable Row Level Security
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;

-- Policy: Instructors can only manage their own availability
CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
  FOR ALL USING (auth.uid() = instructor_id);

-- Insert default availability for existing instructors (weekdays only)
-- This will be run for each instructor when they first access the schedule settings
-- You can run this manually for existing instructors or let the application handle it

-- Example of how to insert default availability for a specific instructor:
-- INSERT INTO instructor_availability (instructor_id, day_of_week, available) VALUES
--   ('instructor-uuid-here', 1, true),  -- Monday
--   ('instructor-uuid-here', 2, true),  -- Tuesday
--   ('instructor-uuid-here', 3, true),  -- Wednesday
--   ('instructor-uuid-here', 4, true),  -- Thursday
--   ('instructor-uuid-here', 5, true),  -- Friday
--   ('instructor-uuid-here', 6, false), -- Saturday
--   ('instructor-uuid-here', 0, false)  -- Sunday
-- ON CONFLICT (instructor_id, day_of_week) DO NOTHING; 