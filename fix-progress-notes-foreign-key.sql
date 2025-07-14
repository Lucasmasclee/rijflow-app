-- Fix progress_notes table foreign key constraint issue
-- IMPORTANT: Run this in your Supabase SQL editor to fix the 409 Conflict error

-- ============================================================================
-- STEP 1: Check current table structure
-- ============================================================================

-- First, let's see what the current progress_notes table looks like
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'progress_notes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Drop and recreate the progress_notes table with correct foreign key
-- ============================================================================

-- Drop existing progress_notes table if it exists
DROP TABLE IF EXISTS public.progress_notes CASCADE;

-- Create progress_notes table with correct foreign key reference
CREATE TABLE public.progress_notes (
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

-- ============================================================================
-- STEP 3: Create indexes for better performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_progress_notes_student_id ON progress_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_instructor_id ON progress_notes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_lesson_id ON progress_notes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_date ON progress_notes(date);

-- ============================================================================
-- STEP 4: Enable Row Level Security
-- ============================================================================

ALTER TABLE progress_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS policies
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
-- STEP 6: Verify the setup
-- ============================================================================

-- Test that the table was created correctly
SELECT 
    'Progress notes table created successfully' as status,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'progress_notes' 
AND table_schema = 'public';

-- Test that RLS is enabled
SELECT 
    'RLS status' as info,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'progress_notes' 
AND schemaname = 'public';

-- Test that policies exist
SELECT 
    'RLS policies' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'progress_notes' 
AND schemaname = 'public';

-- Test that foreign key constraints are correct
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'progress_notes'
AND tc.table_schema = 'public';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This script has successfully:
-- 1. Dropped the problematic progress_notes table
-- 2. Created a new progress_notes table with correct foreign key references
-- 3. Set up performance indexes
-- 4. Enabled Row Level Security
-- 5. Created RLS policies for instructors and students
-- 6. Verified the setup

-- The progress_notes table should now work correctly with proper foreign key references.
-- The instructor_id column now correctly references auth.users(id) instead of a non-existent users table. 