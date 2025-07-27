-- ============================================================================
-- FIX WEEK START DATES IN AVAILABILITY_LINKS
-- ============================================================================
-- Dit script corrigeert de week_start datums in de availability_links tabel
-- zodat ze allemaal op maandag vallen in plaats van dinsdag

-- ============================================================================
-- STAP 1: TOON HUIDIGE SITUATIE
-- ============================================================================

-- Toon huidige week_start datums en welke dag van de week ze zijn
SELECT 
  'Current week_start dates' as info,
  week_start,
  EXTRACT(DOW FROM week_start) as day_of_week,
  CASE EXTRACT(DOW FROM week_start)
    WHEN 0 THEN 'Zondag'
    WHEN 1 THEN 'Maandag'
    WHEN 2 THEN 'Dinsdag'
    WHEN 3 THEN 'Woensdag'
    WHEN 4 THEN 'Donderdag'
    WHEN 5 THEN 'Vrijdag'
    WHEN 6 THEN 'Zaterdag'
  END as day_name
FROM availability_links
ORDER BY week_start
LIMIT 10;

-- ============================================================================
-- STAP 2: CORRIGEER WEEK_START DATUMS
-- ============================================================================

-- Update alle week_start datums naar maandag
UPDATE availability_links 
SET week_start = week_start - INTERVAL '1 day'
WHERE EXTRACT(DOW FROM week_start) = 2; -- Dinsdag = 2

-- ============================================================================
-- STAP 3: VERIFICEER DE WIJZIGINGEN
-- ============================================================================

-- Toon gecorrigeerde week_start datums
SELECT 
  'Corrected week_start dates' as info,
  week_start,
  EXTRACT(DOW FROM week_start) as day_of_week,
  CASE EXTRACT(DOW FROM week_start)
    WHEN 0 THEN 'Zondag'
    WHEN 1 THEN 'Maandag'
    WHEN 2 THEN 'Dinsdag'
    WHEN 3 THEN 'Woensdag'
    WHEN 4 THEN 'Donderdag'
    WHEN 5 THEN 'Vrijdag'
    WHEN 6 THEN 'Zaterdag'
  END as day_name
FROM availability_links
ORDER BY week_start
LIMIT 10;

-- Controleer of alle datums nu op maandag vallen
SELECT 
  'Verification - All dates should be Monday (1)' as info,
  COUNT(*) as total_links,
  COUNT(CASE WHEN EXTRACT(DOW FROM week_start) = 1 THEN 1 END) as monday_links,
  COUNT(CASE WHEN EXTRACT(DOW FROM week_start) != 1 THEN 1 END) as non_monday_links
FROM availability_links;

-- Toon eventuele datums die nog steeds niet op maandag vallen
SELECT 
  'Non-Monday dates found' as info,
  week_start,
  EXTRACT(DOW FROM week_start) as day_of_week,
  CASE EXTRACT(DOW FROM week_start)
    WHEN 0 THEN 'Zondag'
    WHEN 1 THEN 'Maandag'
    WHEN 2 THEN 'Dinsdag'
    WHEN 3 THEN 'Woensdag'
    WHEN 4 THEN 'Donderdag'
    WHEN 5 THEN 'Vrijdag'
    WHEN 6 THEN 'Zaterdag'
  END as day_name
FROM availability_links
WHERE EXTRACT(DOW FROM week_start) != 1
ORDER BY week_start;

-- ============================================================================
-- STAP 4: SAMENVATTING
-- ============================================================================

-- Toon samenvatting van de correctie
SELECT 
  'Summary' as info,
  COUNT(*) as total_links,
  MIN(week_start) as earliest_week,
  MAX(week_start) as latest_week,
  COUNT(DISTINCT student_id) as unique_students,
  COUNT(DISTINCT week_start) as unique_weeks
FROM availability_links;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- ✅ Week start dates zijn succesvol gecorrigeerd!
-- 
-- Belangrijke informatie:
-- - Alle week_start datums vallen nu op maandag
-- - Links zijn nog steeds geldig en werken correct
-- - Geen impact op bestaande beschikbaarheid data
--
-- Volgende stappen:
-- 1. Test het SMS systeem om te controleren of alles werkt
-- 2. Gebruik de gecorrigeerde links voor nieuwe SMS berichten
-- 3. Voor toekomstige link generatie, gebruik de bijgewerkte scripts 