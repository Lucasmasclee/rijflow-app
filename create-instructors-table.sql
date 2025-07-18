-- Create instructors table with rijschoolnaam field for RijFlow app
-- Run this in your Supabase SQL editor

-- ============================================================================
-- INSTRUCTORS TABLE
-- ============================================================================

-- Create instructors table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.instructors (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  rijschoolnaam TEXT DEFAULT 'Mijn Rijschool',
  location TEXT,
  kvk_number TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instructors_email ON instructors(email);

-- Enable Row Level Security
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Instructors can manage own data" ON instructors;

-- Policy: Instructors can only manage their own data
CREATE POLICY "Instructors can manage own data" ON instructors
  FOR ALL USING (auth.uid() = id);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This script has successfully created the instructors table with:
-- 1. rijschoolnaam field for storing the school name
-- 2. Proper foreign key reference to auth.users
-- 3. Row Level Security enabled
-- 4. Appropriate RLS policies
-- 5. Performance indexes

-- The rijschoolnaam field will be automatically populated with 'Mijn Rijschool' 
-- when instructors are first created, and can be updated through the dashboard. 