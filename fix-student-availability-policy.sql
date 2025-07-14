-- Comprehensive fix for student availability RLS policies
-- IMPORTANT: Run this in your Supabase SQL editor to fix the 403 errors
-- This script will create simple and reliable RLS policies for students

-- First, ensure RLS is enabled on the student_availability table
ALTER TABLE student_availability ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Student can manage own availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can view student availability" ON student_availability;
DROP POLICY IF EXISTS "Students can view their own availability" ON student_availability;
DROP POLICY IF EXISTS "Students can insert their own availability" ON student_availability;
DROP POLICY IF EXISTS "Students can update their own availability" ON student_availability;

-- Create simple and reliable policies for students
-- Policy 1: Students can view their own availability
CREATE POLICY "Students can view their own availability" ON student_availability
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id 
            FROM students 
            WHERE id = student_availability.student_id
        )
    );

-- Policy 2: Students can insert their own availability
CREATE POLICY "Students can insert their own availability" ON student_availability
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id 
            FROM students 
            WHERE id = student_availability.student_id
        )
    );

-- Policy 3: Students can update their own availability
CREATE POLICY "Students can update their own availability" ON student_availability
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id 
            FROM students 
            WHERE id = student_availability.student_id
        )
    );

-- Policy 4: Students can delete their own availability
CREATE POLICY "Students can delete their own availability" ON student_availability
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id 
            FROM students 
            WHERE id = student_availability.student_id
        )
    );

-- Policy 5: Instructors can view their students' availability
CREATE POLICY "Instructors can view student availability" ON student_availability
    FOR SELECT USING (
        auth.uid() IN (
            SELECT instructor_id 
            FROM students 
            WHERE id = student_availability.student_id
        )
    );

-- Also fix the users table RLS policy if it exists
-- This addresses the "permission denied for table users" error
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Verify the policies are working
-- You can test this by running:
-- SELECT * FROM student_availability LIMIT 1;
-- This should work for authenticated students and instructors 