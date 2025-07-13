-- Fix for student availability RLS policy
-- Run this in your Supabase SQL editor

-- Drop the existing incorrect policy
DROP POLICY IF EXISTS "Student can manage own availability" ON student_availability;

-- Create the correct policy that uses user_id from students table
CREATE POLICY "Student can manage own availability" ON student_availability
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id 
      FROM students 
      WHERE id = student_availability.student_id
    )
  );

-- Also fix the instructor policy to be more specific
DROP POLICY IF EXISTS "Instructor can view student availability" ON student_availability;

CREATE POLICY "Instructor can view student availability" ON student_availability
  FOR SELECT USING (
    auth.uid() IN (
      SELECT instructor_id 
      FROM students 
      WHERE id = student_availability.student_id
    )
  ); 