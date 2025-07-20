-- Create instructor_ai_settings table for storing AI schedule configuration
-- This table stores AI scheduling preferences for each instructor

CREATE TABLE IF NOT EXISTS instructor_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  pauze_tussen_lessen INTEGER DEFAULT 5,
  lange_pauze_duur INTEGER DEFAULT 0,
  locaties_koppelen BOOLEAN DEFAULT true,
  blokuren BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instructor_ai_settings_instructor_id ON instructor_ai_settings(instructor_id);

-- Enable Row Level Security
ALTER TABLE instructor_ai_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Instructors can manage their own AI settings" ON instructor_ai_settings;

-- Policy: Instructors can only manage their own AI settings
CREATE POLICY "Instructors can manage their own AI settings" ON instructor_ai_settings
  FOR ALL USING (auth.uid() = instructor_id);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This script has successfully created the instructor_ai_settings table with:
-- 1. pauze_tussen_lessen: Minutes of break between lessons (default: 5)
-- 2. lange_pauze_duur: Duration of long breaks (default: 0)
-- 3. locaties_koppelen: Whether to connect locations (default: true)
-- 4. blokuren: Whether to use block hours (default: true)
-- 5. Proper foreign key reference to auth.users
-- 6. Row Level Security enabled
-- 7. Appropriate RLS policies
-- 8. Performance indexes

-- The table will be automatically populated with default values when instructors
-- first access the AI schedule settings. 