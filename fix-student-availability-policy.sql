-- Fix for student availability RLS policy
-- IMPORTANT: Run this in your Supabase SQL editor to fix student availability access
-- This script will update the Row Level Security policies to allow students to access their availability

-- Drop the existing incorrect policies
DROP POLICY IF EXISTS "Student can manage own availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can view student availability" ON student_availability;

-- Create a more robust policy that handles both user_id and metadata cases
CREATE POLICY "Student can manage own availability" ON student_availability
  FOR ALL USING (
    -- Case 1: Student is properly linked via user_id
    auth.uid() IN (
      SELECT user_id 
      FROM students 
      WHERE id = student_availability.student_id
    )
    OR
    -- Case 2: Student is linked via metadata (fallback)
    (auth.uid() IS NOT NULL AND 
     student_availability.student_id = (
       SELECT (raw_user_meta_data->>'student_id')::uuid 
       FROM auth.users 
       WHERE id = auth.uid()
     ))
  );

-- Create instructor policy
CREATE POLICY "Instructor can view student availability" ON student_availability
  FOR SELECT USING (
    auth.uid() IN (
      SELECT instructor_id 
      FROM students 
      WHERE id = student_availability.student_id
    )
  ); 