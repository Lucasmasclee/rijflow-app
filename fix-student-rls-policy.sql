-- Fix for student RLS policy
-- Run this in your Supabase SQL editor

-- Drop the existing student policies
DROP POLICY IF EXISTS "Students can view their own data" ON students;
DROP POLICY IF EXISTS "Students can update their own data" ON students;

-- Create new policies that allow students to access their own data
-- This policy allows students to view their own data using student_id from user metadata
CREATE POLICY "Students can view their own data" ON students
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (auth.uid() IS NOT NULL AND 
         id = (SELECT (user_metadata->>'student_id')::uuid FROM auth.users WHERE id = auth.uid()))
    );

-- This policy allows students to update their own data
CREATE POLICY "Students can update their own data" ON students
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        (auth.uid() IS NOT NULL AND 
         id = (SELECT (user_metadata->>'student_id')::uuid FROM auth.users WHERE id = auth.uid()))
    );

-- Also add a policy for students to insert their own data (for registration)
CREATE POLICY "Students can insert their own data" ON students
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        id = (SELECT (user_metadata->>'student_id')::uuid FROM auth.users WHERE id = auth.uid())
    ); 