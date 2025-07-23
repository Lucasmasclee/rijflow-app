-- ============================================================================
-- UPDATE EXISTING LESSONS WITH CALCULATED LESSEN_GEREGISTREERD VALUES
-- ============================================================================
-- Dit script update bestaande lessen met berekende lessen_geregistreerd waarden
-- Gebruikt de standaard lesduur van 50 minuten als fallback

-- Update lessen met berekende lessen_geregistreerd waarden
-- Dit gebruikt dezelfde logica als de calculateLessonCount functie
UPDATE lessons 
SET lessen_geregistreerd = 
  CASE 
    -- Als de duur 55 minuten of minder is, tel als 1 les
    WHEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60 <= 55 THEN 1
    -- Als de duur tussen 55 en 105 minuten is, tel als 2 lessen
    WHEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60 <= 105 THEN 2
    -- Als de duur tussen 105 en 155 minuten is, tel als 3 lessen
    WHEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60 <= 155 THEN 3
    -- Als de duur tussen 155 en 205 minuten is, tel als 4 lessen
    WHEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60 <= 205 THEN 4
    -- Als de duur tussen 205 en 255 minuten is, tel als 5 lessen
    WHEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60 <= 255 THEN 5
    -- Voor langere lessen, bereken op basis van 50 minuten per les
    ELSE GREATEST(1, CEIL(EXTRACT(EPOCH FROM (end_time - start_time)) / 60 / 50.0))
  END
WHERE lessen_geregistreerd IS NULL OR lessen_geregistreerd = 1;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Toon een overzicht van de update
SELECT 
  'Updated lessons summary' as info,
  COUNT(*) as total_lessons,
  SUM(lessen_geregistreerd) as total_lessen_geregistreerd,
  AVG(lessen_geregistreerd) as avg_lessen_geregistreerd,
  MIN(lessen_geregistreerd) as min_lessen_geregistreerd,
  MAX(lessen_geregistreerd) as max_lessen_geregistreerd
FROM lessons;

-- Toon een voorbeeld van lessen met hun berekende waarden
SELECT 
  'Sample lessons with calculated lessen_geregistreerd' as info,
  id,
  date,
  start_time,
  end_time,
  EXTRACT(EPOCH FROM (end_time - start_time)) / 60 as duration_minutes,
  lessen_geregistreerd,
  status
FROM lessons 
ORDER BY created_at DESC 
LIMIT 15;

-- Toon verdeling van lessen_geregistreerd waarden
SELECT 
  'Distribution of lessen_geregistreerd values' as info,
  lessen_geregistreerd,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM lessons), 2) as percentage
FROM lessons 
GROUP BY lessen_geregistreerd 
ORDER BY lessen_geregistreerd; 