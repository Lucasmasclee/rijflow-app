-- Database setup script for RijFlow app
-- Run this in your Supabase SQL editor

-- Add invite_token column to students table if it doesn't exist
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS invite_token UUID;

-- Add user_id column to students table if it doesn't exist
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index on invite_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_invite_token ON students(invite_token);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- Add RLS (Row Level Security) policies if needed
-- This ensures instructors can only see their own students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy for instructors to see their own students
CREATE POLICY "Instructors can view their own students" ON students
    FOR SELECT USING (auth.uid() = instructor_id);

-- Policy for instructors to insert their own students
CREATE POLICY "Instructors can insert their own students" ON students
    FOR INSERT WITH CHECK (auth.uid() = instructor_id);

-- Policy for instructors to update their own students
CREATE POLICY "Instructors can update their own students" ON students
    FOR UPDATE USING (auth.uid() = instructor_id);

-- Policy for students to view their own data
CREATE POLICY "Students can view their own data" ON students
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (auth.uid() IS NOT NULL AND 
         id = (SELECT (user_metadata->>'student_id')::uuid FROM auth.users WHERE id = auth.uid()))
    );

-- Policy for students to update their own data
CREATE POLICY "Students can update their own data" ON students
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        (auth.uid() IS NOT NULL AND 
         id = (SELECT (user_metadata->>'student_id')::uuid FROM auth.users WHERE id = auth.uid()))
    );

-- Policy for students to insert their own data (for registration)
CREATE POLICY "Students can insert their own data" ON students
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        id = (SELECT (user_metadata->>'student_id')::uuid FROM auth.users WHERE id = auth.uid())
    );

-- Policy for anonymous users to view students by invite token (for invitation links)
CREATE POLICY "Anonymous users can view students by invite token" ON students
    FOR SELECT USING (invite_token IS NOT NULL); 

-- Student availability per week
CREATE TABLE IF NOT EXISTS student_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL, -- maandag van de week
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_availability_student_id ON student_availability(student_id);
CREATE INDEX IF NOT EXISTS idx_student_availability_week_start ON student_availability(week_start);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_availability_unique ON student_availability(student_id, week_start);

-- Enable RLS
ALTER TABLE student_availability ENABLE ROW LEVEL SECURITY;

-- Policy: student mag eigen beschikbaarheid lezen/schrijven
CREATE POLICY "Student can manage own availability" ON student_availability
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id 
      FROM students 
      WHERE id = student_availability.student_id
    )
  );

-- Policy: instructeur mag beschikbaarheid van zijn leerlingen lezen
CREATE POLICY "Instructor can view student availability" ON student_availability
  FOR SELECT USING (
    auth.uid() IN (
      SELECT instructor_id 
      FROM students 
      WHERE id = student_availability.student_id
    )
  ); 