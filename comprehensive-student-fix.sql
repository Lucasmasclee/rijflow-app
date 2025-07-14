-- Comprehensive fix for all student-related RLS issues
-- IMPORTANT: Run this in your Supabase SQL editor to fix all student access problems
-- This script addresses the 403 errors and permission denied issues

-- ============================================================================
-- STEP 1: Ensure all necessary columns exist
-- ============================================================================

-- Add missing columns to students table if they don't exist
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS invite_token UUID;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_invite_token ON students(invite_token);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- ============================================================================
-- STEP 2: Fix students table RLS policies
-- ============================================================================

-- Enable RLS on students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Students can view their own data" ON students;
DROP POLICY IF EXISTS "Students can update their own data" ON students;
DROP POLICY IF EXISTS "Students can insert their own data" ON students;
DROP POLICY IF EXISTS "Instructors can view their own students" ON students;
DROP POLICY IF EXISTS "Instructors can insert their own students" ON students;
DROP POLICY IF EXISTS "Instructors can update their own students" ON students;
DROP POLICY IF EXISTS "Anonymous users can view students by invite token" ON students;

-- Create simple and reliable policies for students
CREATE POLICY "Students can view their own data" ON students
    FOR SELECT USING (
        auth.uid() = user_id
    );

CREATE POLICY "Students can update their own data" ON students
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Students can insert their own data" ON students
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Create policies for instructors
CREATE POLICY "Instructors can view their own students" ON students
    FOR SELECT USING (
        auth.uid() = instructor_id
    );

CREATE POLICY "Instructors can insert their own students" ON students
    FOR INSERT WITH CHECK (
        auth.uid() = instructor_id
    );

CREATE POLICY "Instructors can update their own students" ON students
    FOR UPDATE USING (
        auth.uid() = instructor_id
    );

-- Policy for anonymous users to view students by invite token (for invitation links)
CREATE POLICY "Anonymous users can view students by invite token" ON students
    FOR SELECT USING (invite_token IS NOT NULL);

-- ============================================================================
-- STEP 3: Fix student_availability table RLS policies
-- ============================================================================

-- Ensure student_availability table exists with correct structure
CREATE TABLE IF NOT EXISTS student_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for student_availability
CREATE INDEX IF NOT EXISTS idx_student_availability_student_id ON student_availability(student_id);
CREATE INDEX IF NOT EXISTS idx_student_availability_week_start ON student_availability(week_start);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_availability_unique ON student_availability(student_id, week_start);

-- Enable RLS on student_availability table
ALTER TABLE student_availability ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Student can manage own availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can view student availability" ON student_availability;
DROP POLICY IF EXISTS "Students can view their own availability" ON student_availability;
DROP POLICY IF EXISTS "Students can insert their own availability" ON student_availability;
DROP POLICY IF EXISTS "Students can update their own availability" ON student_availability;
DROP POLICY IF EXISTS "Students can delete their own availability" ON student_availability;

-- Create simple and reliable policies for students
CREATE POLICY "Students can view their own availability" ON student_availability
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id 
            FROM students 
            WHERE id = student_availability.student_id
        )
    );

CREATE POLICY "Students can insert their own availability" ON student_availability
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id 
            FROM students 
            WHERE id = student_availability.student_id
        )
    );

CREATE POLICY "Students can update their own availability" ON student_availability
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id 
            FROM students 
            WHERE id = student_availability.student_id
        )
    );

CREATE POLICY "Students can delete their own availability" ON student_availability
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id 
            FROM students 
            WHERE id = student_availability.student_id
        )
    );

-- Create policy for instructors to view their students' availability
CREATE POLICY "Instructors can view student availability" ON student_availability
    FOR SELECT USING (
        auth.uid() IN (
            SELECT instructor_id 
            FROM students 
            WHERE id = student_availability.student_id
        )
    );

-- ============================================================================
-- STEP 4: Fix users table RLS policies (if users table exists)
-- ============================================================================

-- Check if users table exists and fix its policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Enable RLS on users table
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own data" ON users;
        DROP POLICY IF EXISTS "Users can update own data" ON users;
        
        -- Create policies for users table
        CREATE POLICY "Users can view own data" ON users
            FOR SELECT USING (auth.uid() = id);
        
        CREATE POLICY "Users can update own data" ON users
            FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Verify the setup
-- ============================================================================

-- Test query to verify policies are working
-- This should return the current user's student record if they are a student
SELECT 
    'Students table policies' as test,
    COUNT(*) as accessible_records
FROM students 
WHERE user_id = auth.uid();

-- This should return the current user's availability records if they are a student
SELECT 
    'Student availability table policies' as test,
    COUNT(*) as accessible_records
FROM student_availability sa
JOIN students s ON sa.student_id = s.id
WHERE s.user_id = auth.uid();

-- ============================================================================
-- STEP 6: Debug information
-- ============================================================================

-- Show current user information
SELECT 
    'Current user info' as info,
    auth.uid() as user_id,
    auth.jwt() ->> 'email' as email,
    auth.jwt() ->> 'user_metadata' as metadata;

-- Show student records for current user
SELECT 
    'Student records for current user' as info,
    id,
    first_name,
    last_name,
    user_id,
    instructor_id
FROM students 
WHERE user_id = auth.uid(); 