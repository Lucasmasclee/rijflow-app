-- Create lessons table and RLS policies for RijFlow app
-- Run this in your Supabase SQL editor

-- ============================================================================
-- LESSONS TABLE
-- ============================================================================

-- Create lessons table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
  notes TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lessons_instructor_id ON lessons(instructor_id);
CREATE INDEX IF NOT EXISTS idx_lessons_student_id ON lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_date ON lessons(date);
CREATE INDEX IF NOT EXISTS idx_lessons_date_instructor ON lessons(date, instructor_id);

-- Enable Row Level Security
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Instructors can manage own lessons" ON lessons;
DROP POLICY IF EXISTS "Students can view own lessons" ON lessons;

-- Policy: Instructors can manage their own lessons
CREATE POLICY "Instructors can manage own lessons" ON lessons
  FOR ALL USING (auth.uid() = instructor_id);

-- Policy: Students can view their own lessons
CREATE POLICY "Students can view own lessons" ON lessons
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id 
      FROM students 
      WHERE id = lessons.student_id
    )
  );

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This script has successfully set up the lessons table for the RijFlow app:
-- 1. Created lessons table with all required columns
-- 2. Set up performance indexes
-- 3. Enabled Row Level Security
-- 4. Created RLS policies for instructors and students

-- The lessons table is now ready to store lesson data with proper security policies. 