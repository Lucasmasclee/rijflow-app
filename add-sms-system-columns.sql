-- Add SMS system columns to students table
-- Run this in your Supabase SQL editor

-- Add public_token column for SMS links
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;

-- Add SMS_laatst_gestuurd column to track when SMS was last sent
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS sms_laatst_gestuurd TIMESTAMP WITH TIME ZONE;

-- Add public_url column for convenience
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS public_url TEXT;

-- Create index on public_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_public_token ON students(public_token);

-- Create index on sms_laatst_gestuurd for filtering
CREATE INDEX IF NOT EXISTS idx_students_sms_laatst_gestuurd ON students(sms_laatst_gestuurd);

-- Add comments to document the new fields
COMMENT ON COLUMN students.public_token IS 'Unique token for SMS availability links';
COMMENT ON COLUMN students.sms_laatst_gestuurd IS 'Timestamp when SMS was last sent to this student';
COMMENT ON COLUMN students.public_url IS 'Full URL for availability form';

-- Update existing students to generate public_token if they don't have one
UPDATE students 
SET public_token = gen_random_uuid()::text
WHERE public_token IS NULL;

-- Update public_url for all students
UPDATE students 
SET public_url = 'https://rijflow.nl/beschikbaarheid/' || public_token
WHERE public_token IS NOT NULL;

-- Verify the changes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'students' 
AND column_name IN ('public_token', 'sms_laatst_gestuurd', 'public_url')
ORDER BY ordinal_position; 