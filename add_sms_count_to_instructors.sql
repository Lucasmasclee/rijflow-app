-- Migration: Add sms_count column to instructors table
-- This migration adds an sms_count column to track the number of SMS messages sent by each instructor

-- Add the sms_count column to the instructors table
ALTER TABLE instructors 
ADD COLUMN sms_count INTEGER DEFAULT 0 NOT NULL;

-- Add a comment to document the purpose of this column
COMMENT ON COLUMN instructors.sms_count IS 'Counter for the number of SMS messages sent by this instructor';

-- Create an index on sms_count for better query performance when filtering by SMS count
CREATE INDEX idx_instructors_sms_count ON instructors(sms_count);

-- Update existing records to have sms_count = 0 (since DEFAULT 0 should handle this, but being explicit)
UPDATE instructors SET sms_count = 0 WHERE sms_count IS NULL;

-- Verify the column was added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'instructors' 
AND column_name = 'sms_count';
