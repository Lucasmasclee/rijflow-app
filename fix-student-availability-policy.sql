-- Fix for student_availability RLS policy
-- This script removes the problematic auth.users table access that was causing permission errors
-- IMPORTANT: Run this in your Supabase SQL editor to fix the 403 errors

-- First, ensure RLS is enabled on the student_availability table
ALTER TABLE student_availability ENABLE ROW LEVEL SECURITY;

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Student can manage own availability" ON student_availability;

-- Create a simplified policy that only uses the students table
-- This avoids the permission denied error for auth.users table
CREATE POLICY "Student can manage own availability" ON student_availability
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id 
      FROM students 
      WHERE id = student_availability.student_id
    )
  );

-- The instructor policy should already be working correctly, but let's make sure it exists
DROP POLICY IF EXISTS "Instructor can view student availability" ON student_availability;

CREATE POLICY "Instructor can view student availability" ON student_availability
  FOR SELECT USING (
    auth.uid() IN (
      SELECT instructor_id 
      FROM students 
      WHERE id = student_availability.student_id
    )
  );

-- Verify the policies are working
-- You can test this by running:
-- SELECT * FROM student_availability LIMIT 1;
-- This should work for authenticated students and instructors 