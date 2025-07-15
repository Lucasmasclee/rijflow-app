-- Quick fix for lessons table
-- Run this in your Supabase SQL editor

-- ============================================================================
-- STEP 1: Drop and recreate lessons table
-- ============================================================================

-- Drop existing lessons table (WARNING: This will delete all existing lessons)
DROP TABLE IF EXISTS public.lessons CASCADE;

-- Create lessons table with correct structure
CREATE TABLE public.lessons (
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

-- ============================================================================
-- STEP 2: Create indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_lessons_instructor_id ON lessons(instructor_id);
CREATE INDEX IF NOT EXISTS idx_lessons_student_id ON lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_date ON lessons(date);
CREATE INDEX IF NOT EXISTS idx_lessons_date_instructor ON lessons(date, instructor_id);

-- ============================================================================
-- STEP 3: Enable RLS
-- ============================================================================

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create RLS policies
-- ============================================================================

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
-- STEP 5: Test the setup
-- ============================================================================

-- Verify table was created
SELECT 
    'Lessons table created successfully' as status,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND table_schema = 'public';

-- Verify RLS is enabled
SELECT 
    'RLS status' as info,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'lessons' 
AND schemaname = 'public';

-- Verify policies exist
SELECT 
    'RLS policies' as info,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'lessons' 
AND schemaname = 'public'; 