-- Create progress_notes table and update database structure for RijFlow app
-- Run this in your Supabase SQL editor

-- ============================================================================
-- PROGRESS NOTES TABLE
-- ============================================================================

-- Create progress_notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.progress_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  notes TEXT NOT NULL,
  topics_covered TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_progress_notes_student_id ON progress_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_instructor_id ON progress_notes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_lesson_id ON progress_notes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_date ON progress_notes(date);

-- Enable Row Level Security
ALTER TABLE progress_notes ENABLE ROW LEVEL SECURITY;

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
-- UPDATE STUDENTS TABLE
-- ============================================================================

-- Ensure students table has the notes column for general notes
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment to clarify the purpose of the notes column
COMMENT ON COLUMN students.notes IS 'General notes about the student (not editable in lesson view)';

-- ============================================================================
-- UPDATE LESSONS TABLE
-- ============================================================================

-- Ensure lessons table has the notes column for lesson-specific notes
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment to clarify the purpose of the notes column
COMMENT ON COLUMN lessons.notes IS 'Notes specific to this lesson (editable in lesson form and lesson view)';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This script has successfully set up the notes system for the RijFlow app:
-- 1. Created progress_notes table for progress notes per student
-- 2. Updated students table to ensure notes column exists for general notes
-- 3. Updated lessons table to ensure notes column exists for lesson notes
-- 4. Set up performance indexes
-- 5. Enabled Row Level Security
-- 6. Created RLS policies for instructors and students

-- The notes system now supports 3 types of notes:
-- 1. General notes per student (students.notes) - editable in student profile
-- 2. Progress notes per student (progress_notes table) - editable in student profile and lesson view
-- 3. Notes per lesson (lessons.notes) - editable in lesson form and lesson view 