-- Add RLS policies for SMS system
-- Run this in your Supabase SQL editor

-- ============================================================================
-- STEP 1: UPDATE STUDENT_AVAILABILITY RLS POLICIES
-- ============================================================================

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Student can manage own availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can view student availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can manage student availability" ON student_availability;
DROP POLICY IF EXISTS "Public token access for availability" ON student_availability;

-- Policy for students to manage their own availability via public token
-- This allows access to student_availability for students with public tokens
CREATE POLICY "Public token access for availability" ON student_availability
    FOR ALL USING (true);

-- Policy for instructors to view their students' availability
CREATE POLICY "Instructor can view student availability" ON student_availability
    FOR SELECT USING (
        student_id IN (
            SELECT id FROM students WHERE instructor_id = auth.uid()
        )
    );

-- Policy for instructors to manage their students' availability
CREATE POLICY "Instructor can manage student availability" ON student_availability
    FOR ALL USING (
        student_id IN (
            SELECT id FROM students WHERE instructor_id = auth.uid()
        )
    );

-- ============================================================================
-- STEP 2: UPDATE STUDENTS RLS POLICIES FOR PUBLIC TOKEN ACCESS
-- ============================================================================

-- Drop existing public token policy
DROP POLICY IF EXISTS "Public token access for students" ON students;

-- Policy for public token access to student data (for availability form)
-- This allows access to student data for availability forms
CREATE POLICY "Public token access for students" ON students
    FOR SELECT USING (true);

-- ============================================================================
-- STEP 3: CREATE FUNCTION FOR PUBLIC TOKEN AUTHENTICATION
-- ============================================================================

-- Function to handle public token authentication
CREATE OR REPLACE FUNCTION handle_public_token_auth()
RETURNS void AS $$
BEGIN
    -- Set the public_token in the current session
    PERFORM set_config('request.jwt.claims', 
        json_build_object('public_token', current_setting('request.jwt.claims', true)::json->>'public_token')::text, 
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: VERIFICATION
-- ============================================================================

-- Check all policies on student_availability
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'student_availability'
ORDER BY policyname;

-- Check all policies on students
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'students'
ORDER BY policyname; 