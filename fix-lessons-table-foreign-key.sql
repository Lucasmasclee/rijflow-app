-- Fix lessons table foreign key constraint issue
-- IMPORTANT: Run this in your Supabase SQL editor to fix the 409 Conflict error

-- ============================================================================
-- STEP 1: Check current table structure
-- ============================================================================

-- First, let's see what the current lessons table looks like
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Drop and recreate the lessons table with correct foreign key
-- ============================================================================

-- Drop existing lessons table if it exists
DROP TABLE IF EXISTS public.lessons CASCADE;

-- Create lessons table with correct foreign key reference
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
-- STEP 3: Create indexes for better performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_lessons_instructor_id ON lessons(instructor_id);
CREATE INDEX IF NOT EXISTS idx_lessons_student_id ON lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_date ON lessons(date);
CREATE INDEX IF NOT EXISTS idx_lessons_date_instructor ON lessons(date, instructor_id);

-- ============================================================================
-- STEP 4: Enable Row Level Security
-- ============================================================================

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS policies
-- ============================================================================

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
-- STEP 6: Verify the setup
-- ============================================================================

-- Test that the table was created correctly
SELECT 
    'Lessons table created successfully' as status,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND table_schema = 'public';

-- Test that RLS is enabled
SELECT 
    'RLS status' as info,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'lessons' 
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
WHERE tablename = 'lessons' 
AND schemaname = 'public';

-- ============================================================================
-- STEP 7: Debug current user information
-- ============================================================================

-- Show current user information
SELECT 
    'Current user info' as info,
    auth.uid() as user_id,
    auth.jwt() ->> 'email' as email,
    auth.jwt() ->> 'user_metadata' as metadata;

-- Check if current user exists in auth.users
SELECT 
    'User exists in auth.users' as check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()) 
        THEN 'YES' 
        ELSE 'NO' 
    END as user_exists;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This script has successfully:
-- 1. Dropped and recreated the lessons table with correct foreign key constraints
-- 2. Created performance indexes
-- 3. Enabled Row Level Security
-- 4. Created RLS policies for instructors and students
-- 5. Verified the setup

-- The lessons table should now work correctly with proper foreign key references. 