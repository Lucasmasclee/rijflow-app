-- ============================================================================
-- ADD DEFAULT LESSON DURATION TO STANDARD_AVAILABILITY TABLE
-- ============================================================================
-- Dit script voegt de default_lesson_duration kolom toe aan de standard_availability tabel

-- Voeg de default_lesson_duration kolom toe
ALTER TABLE standard_availability 
ADD COLUMN IF NOT EXISTS default_lesson_duration INTEGER DEFAULT 50;

-- Update bestaande records met de standaard waarde van 50 minuten
UPDATE standard_availability 
SET default_lesson_duration = 50 
WHERE default_lesson_duration IS NULL;

-- Maak de kolom NOT NULL na het updaten van bestaande records
ALTER TABLE standard_availability 
ALTER COLUMN default_lesson_duration SET NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Controleer of de kolom is toegevoegd
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'standard_availability'
  AND column_name = 'default_lesson_duration';

-- Controleer de huidige tabel structuur
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'standard_availability'
ORDER BY ordinal_position; 