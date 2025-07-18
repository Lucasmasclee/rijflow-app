-- Update progress_notes table to use single row per student
-- Run this in your Supabase SQL editor

-- ============================================================================
-- STEP 1: Create new progress_notes table structure
-- ============================================================================

-- Drop existing progress_notes table
DROP TABLE IF EXISTS public.progress_notes CASCADE;

-- Create new progress_notes table with single row per student
CREATE TABLE public.progress_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE UNIQUE,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create indexes for better performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_progress_notes_student_id ON progress_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_instructor_id ON progress_notes(instructor_id);

-- ============================================================================
-- STEP 3: Enable Row Level Security
-- ============================================================================

ALTER TABLE progress_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create RLS policies
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Instructors can manage progress notes" ON progress_notes;
DROP POLICY IF EXISTS "Students can view own progress notes" ON progress_notes;

-- Policy: Instructors can manage progress notes for their students
CREATE POLICY "Instructors can manage progress notes" ON progress_notes
  FOR ALL USING (auth.uid() = instructor_id);

-- Policy: Students can view their own progress notes
CREATE POLICY "Students can view own progress notes" ON progress_notes
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id 
      FROM students 
      WHERE id = progress_notes.student_id
    )
  );

-- ============================================================================
-- STEP 5: Create function to automatically update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for progress_notes table
DROP TRIGGER IF EXISTS update_progress_notes_updated_at ON progress_notes;
CREATE TRIGGER update_progress_notes_updated_at
    BEFORE UPDATE ON progress_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This script has successfully:
-- 1. Dropped the old progress_notes table with multiple rows per note
-- 2. Created a new progress_notes table with single row per student
-- 3. Set up performance indexes
-- 4. Enabled Row Level Security
-- 5. Created RLS policies for instructors and students
-- 6. Added automatic updated_at timestamp functionality

-- The new structure:
-- - One row per student
-- - notes TEXT field contains the entire progress history
-- - instructor_id links to the instructor who manages this student
-- - UNIQUE constraint on student_id ensures one row per student 