-- Update instructors table with default values for subscription fields
-- Based on the actual instructors table structure in Supabase

-- First, update existing NULL values to have proper defaults
UPDATE instructors 
SET 
  subscription_status = 'trial',
  trial_ends_at = (NOW() + INTERVAL '60 days')::timestamp
WHERE 
  subscription_status IS NULL 
  OR trial_ends_at IS NULL;

-- Add default values and constraints for subscription columns
ALTER TABLE instructors 
  ALTER COLUMN subscription_status SET DEFAULT 'trial',
  ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '60 days')::timestamp;

-- Add comment to document the structure
COMMENT ON TABLE instructors IS 'Instructors table with subscription fields and default values'; 