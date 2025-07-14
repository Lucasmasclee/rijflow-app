-- Fix for student RLS policy
-- IMPORTANT: Run this in your Supabase SQL editor to fix the 406 error
-- This script will update the Row Level Security policies to allow students to access their data

-- Drop the existing student policies
DROP POLICY IF EXISTS "Students can view their own data" ON students;
DROP POLICY IF EXISTS "Students can update their own data" ON students;
DROP POLICY IF EXISTS "Students can insert their own data" ON students;

-- Create simpler and more reliable policies
-- This policy allows students to view their own data using user_id
CREATE POLICY "Students can view their own data" ON students
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- This policy allows students to update their own data
CREATE POLICY "Students can update their own data" ON students
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- This policy allows students to insert their own data (for registration)
CREATE POLICY "Students can insert their own data" ON students
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Also ensure instructors can still access their students
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