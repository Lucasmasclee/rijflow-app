-- Fix student required fields - make only first_name required
-- Run this in your Supabase SQL editor

-- Make last_name optional (remove NOT NULL constraint)
ALTER TABLE students 
ALTER COLUMN last_name DROP NOT NULL;

-- Make email optional (remove NOT NULL constraint)
ALTER TABLE students 
ALTER COLUMN email DROP NOT NULL;

-- Make phone optional (remove NOT NULL constraint)
ALTER TABLE students 
ALTER COLUMN phone DROP NOT NULL;

-- Make address optional (remove NOT NULL constraint)
ALTER TABLE students 
ALTER COLUMN address DROP NOT NULL;

-- Verify the changes
-- first_name should still be NOT NULL, all others should be nullable
SELECT 
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns 
WHERE table_name = 'students' 
AND table_schema = 'public'
ORDER BY ordinal_position; 