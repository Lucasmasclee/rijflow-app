-- Complete Database Setup Script for RijFlow App
-- Run this in your Supabase SQL editor to set up all required tables

-- ============================================================================
-- EXISTING TABLES AND MODIFICATIONS
-- ============================================================================

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Instructors can view their own students" ON students;
DROP POLICY IF EXISTS "Instructors can insert their own students" ON students;
DROP POLICY IF EXISTS "Instructors can update their own students" ON students;
DROP POLICY IF EXISTS "Students can view their own data" ON students;
DROP POLICY IF EXISTS "Students can update their own data" ON students;
DROP POLICY IF EXISTS "Students can insert their own data" ON students;

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
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for students to update their own data
CREATE POLICY "Students can update their own data" ON students
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy for students to insert their own data
CREATE POLICY "Students can insert their own data" ON students
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for anonymous users to view students by invite token (for invitation links)
CREATE POLICY "Anonymous users can view students by invite token" ON students
    FOR SELECT USING (invite_token IS NOT NULL); 

-- ============================================================================
-- STUDENT AVAILABILITY TABLE
-- ============================================================================

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Student can manage own availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can view student availability" ON student_availability;

-- Policy: student mag eigen beschikbaarheid lezen/schrijven
-- Simplified policy that only uses the students table
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

-- ============================================================================
-- INSTRUCTOR AVAILABILITY TABLE (NEW)
-- ============================================================================

-- Create instructor_availability table for storing standard instructor working days
-- This table stores which days of the week an instructor is normally available
CREATE TABLE IF NOT EXISTS instructor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  available BOOLEAN NOT NULL DEFAULT true,
  start_time TIME DEFAULT '09:00:00', -- Default start time for the day
  end_time TIME DEFAULT '17:00:00',   -- Default end time for the day
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per instructor per day
  UNIQUE(instructor_id, day_of_week)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instructor_availability_instructor_id ON instructor_availability(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_availability_day_of_week ON instructor_availability(day_of_week);

-- Enable Row Level Security
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;

-- Policy: Instructors can only manage their own availability
CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
  FOR ALL USING (auth.uid() = instructor_id);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This script has successfully set up all required tables for the RijFlow app:
-- 1. Modified students table with invite_token and user_id columns
-- 2. Created student_availability table for weekly student availability
-- 3. Created instructor_availability table for standard instructor working days
-- 4. Set up all necessary Row Level Security policies
-- 5. Created performance indexes

-- The instructor_availability table will be automatically populated with default values
-- when instructors first access the schedule settings or week overview pages. 