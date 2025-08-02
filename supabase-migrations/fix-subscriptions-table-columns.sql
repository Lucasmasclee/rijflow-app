-- Fix subscriptions table column names to match actual Supabase schema
-- Based on what we see in the Supabase dashboard

-- First, let's see what columns actually exist
-- This will help us understand the current structure

-- Update existing NULL values to have proper defaults
UPDATE subscriptions 
SET 
  subscription_status = 'trial',
  trial_ends_at = (NOW() + INTERVAL '60 days')::timestamp
WHERE 
  subscription_status IS NULL 
  OR trial_ends_at IS NULL;

-- Add default values and constraints for the columns we know exist
ALTER TABLE subscriptions 
  ALTER COLUMN subscription_status SET NOT NULL,
  ALTER COLUMN subscription_status SET DEFAULT 'trial',
  ALTER COLUMN trial_ends_at SET NOT NULL,
  ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '60 days')::timestamp;

-- Add comment to document the structure
COMMENT ON TABLE subscriptions IS 'Subscription table with actual Supabase column names'; 