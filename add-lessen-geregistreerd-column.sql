-- ============================================================================
-- ADD LESSEN_GEREGISTREERD COLUMN TO LESSONS TABLE
-- ============================================================================
-- Dit script voegt de lessen_geregistreerd kolom toe aan de lessons tabel
-- Deze kolom slaat het berekende aantal lessen op basis van de lesduur

-- Voeg de lessen_geregistreerd kolom toe
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS lessen_geregistreerd INTEGER DEFAULT 1;

-- Update bestaande lessen met berekende waarden
-- Dit gebruikt de standaard lesduur van 50 minuten als fallback
UPDATE lessons 
SET lessen_geregistreerd = 
  CASE 
    WHEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60 <= 55 THEN 1
    WHEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60 <= 105 THEN 2
    WHEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60 <= 155 THEN 3
    WHEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60 <= 205 THEN 4
    WHEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60 <= 255 THEN 5
    ELSE CEIL(EXTRACT(EPOCH FROM (end_time - start_time)) / 60 / 50.0)
  END
WHERE lessen_geregistreerd IS NULL OR lessen_geregistreerd = 1;

-- Maak de kolom NOT NULL na het updaten van bestaande records
ALTER TABLE lessons 
ALTER COLUMN lessen_geregistreerd SET NOT NULL;

-- Voeg een comment toe aan de kolom
COMMENT ON COLUMN lessons.lessen_geregistreerd IS 'Aantal lessen dat deze les vertegenwoordigt op basis van de lesduur';

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
  AND table_name = 'lessons'
  AND column_name = 'lessen_geregistreerd';

-- Controleer de huidige tabel structuur
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lessons'
ORDER BY ordinal_position;

-- Toon een voorbeeld van de berekende waarden
SELECT 
  'Sample lessons with calculated lessen_geregistreerd' as info,
  id,
  date,
  start_time,
  end_time,
  EXTRACT(EPOCH FROM (end_time - start_time)) / 60 as duration_minutes,
  lessen_geregistreerd
FROM lessons 
ORDER BY created_at DESC 
LIMIT 10; 