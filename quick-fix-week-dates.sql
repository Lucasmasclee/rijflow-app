-- ============================================================================
-- QUICK FIX WEEK START DATES
-- ============================================================================
-- Eenvoudig script om week_start datums te corrigeren naar maandag

-- Update alle week_start datums naar maandag (van dinsdag)
UPDATE availability_links 
SET week_start = week_start - INTERVAL '1 day'
WHERE EXTRACT(DOW FROM week_start) = 2; -- Dinsdag = 2

-- Toon resultaat
SELECT 
  'Week dates fixed' as status,
  COUNT(*) as total_links,
  COUNT(CASE WHEN EXTRACT(DOW FROM week_start) = 1 THEN 1 END) as monday_links
FROM availability_links; 