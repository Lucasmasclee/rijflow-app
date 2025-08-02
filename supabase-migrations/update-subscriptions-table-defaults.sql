-- Update subscriptions table with default values and non-nullable constraints
-- This prevents NULL values and ensures all users have a proper subscription record

-- First, update existing NULL values to have proper defaults
UPDATE subscriptions 
SET 
  subscription_status = 'trial',
  subscription_tier = 'free',
  trial_ends_at = (NOW() + INTERVAL '60 days')::timestamp,
  created_at = NOW(),
  updated_at = NOW()
WHERE 
  subscription_status IS NULL 
  OR subscription_tier IS NULL 
  OR trial_ends_at IS NULL 
  OR created_at IS NULL 
  OR updated_at IS NULL;

-- Now alter the table to make columns non-nullable and add default values
ALTER TABLE subscriptions 
  ALTER COLUMN subscription_status SET NOT NULL,
  ALTER COLUMN subscription_status SET DEFAULT 'trial',
  ALTER COLUMN subscription_tier SET NOT NULL,
  ALTER COLUMN subscription_tier SET DEFAULT 'free',
  ALTER COLUMN trial_ends_at SET NOT NULL,
  ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '60 days')::timestamp,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Add a comment to document the changes
COMMENT ON TABLE subscriptions IS 'Subscription table with non-nullable constraints and default values to prevent NULL values'; 