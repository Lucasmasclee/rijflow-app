-- ============================================================================
-- GENERATE AVAILABILITY LINKS FOR ALL STUDENTS
-- ============================================================================
-- Dit script genereert week-specifieke beschikbaarheid links voor alle leerlingen
-- voor de komende 8 weken (vanaf volgende week)

-- ============================================================================
-- STAP 1: CONTROLEER OF AVAILABILITY_LINKS TABEL BESTAAT
-- ============================================================================

-- Controleer of de tabel bestaat
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'availability_links') THEN
        RAISE EXCEPTION 'availability_links tabel bestaat niet. Voer eerst create-week-specific-links.sql uit.';
    END IF;
END $$;

-- ============================================================================
-- STAP 2: GENEREER LINKS VOOR ALLE LEERLINGEN
-- ============================================================================

-- Bereken de komende 8 weken (vanaf volgende week)
-- Gebruik maandag als startdag van de week
WITH week_starts AS (
  SELECT 
    (CURRENT_DATE + INTERVAL '1 week')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '1 week')::date)::int + 1 as week_start
  UNION ALL
  SELECT 
    (CURRENT_DATE + INTERVAL '2 weeks')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '2 weeks')::date)::int + 1
  UNION ALL
  SELECT 
    (CURRENT_DATE + INTERVAL '3 weeks')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '3 weeks')::date)::int + 1
  UNION ALL
  SELECT 
    (CURRENT_DATE + INTERVAL '4 weeks')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '4 weeks')::date)::int + 1
  UNION ALL
  SELECT 
    (CURRENT_DATE + INTERVAL '5 weeks')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '5 weeks')::date)::int + 1
  UNION ALL
  SELECT 
    (CURRENT_DATE + INTERVAL '6 weeks')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '6 weeks')::date)::int + 1
  UNION ALL
  SELECT 
    (CURRENT_DATE + INTERVAL '7 weeks')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '7 weeks')::date)::int + 1
  UNION ALL
  SELECT 
    (CURRENT_DATE + INTERVAL '8 weeks')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '8 weeks')::date)::int + 1
),
all_students AS (
  SELECT DISTINCT s.id as student_id, s.first_name, s.last_name
  FROM students s
  WHERE s.id IS NOT NULL
)
-- Genereer links voor alle leerlingen voor alle weken
SELECT 
  'Generating links for student: ' || s.first_name || ' ' || COALESCE(s.last_name, '') || 
  ' for week starting: ' || ws.week_start::text as info,
  create_availability_link(s.student_id, ws.week_start::date) as generated_token
FROM all_students s
CROSS JOIN week_starts ws
ORDER BY s.first_name, s.last_name, ws.week_start;

-- ============================================================================
-- STAP 3: TOON RESULTATEN
-- ============================================================================

-- Toon hoeveel links er zijn aangemaakt
SELECT 
  'Total availability links created' as info,
  COUNT(*) as total_links
FROM availability_links;

-- Toon links per leerling
SELECT 
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  COUNT(al.id) as links_count,
  MIN(al.week_start) as earliest_week,
  MAX(al.week_start) as latest_week
FROM students s
LEFT JOIN availability_links al ON s.id = al.student_id
GROUP BY s.id, s.first_name, s.last_name
ORDER BY s.first_name, s.last_name;

-- Toon voorbeeld links voor de eerste leerling
SELECT 
  'Example links for: ' || s.first_name || ' ' || COALESCE(s.last_name, '') as student_info,
  al.week_start,
  al.token,
  al.expires_at,
  'https://rijflow.nl/beschikbaarheid/' || al.token as full_url
FROM students s
JOIN availability_links al ON s.id = al.student_id
WHERE s.id = (SELECT id FROM students ORDER BY first_name, last_name LIMIT 1)
ORDER BY al.week_start
LIMIT 3;

-- ============================================================================
-- STAP 4: VERIFICATIE
-- ============================================================================

-- Controleer of alle leerlingen links hebben
SELECT 
  'Students without links' as info,
  COUNT(*) as count
FROM students s
LEFT JOIN availability_links al ON s.id = al.student_id
WHERE al.id IS NULL;

-- Controleer verlopen links
SELECT 
  'Expired links' as info,
  COUNT(*) as count
FROM availability_links
WHERE expires_at <= NOW();

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- ✅ Availability links zijn succesvol gegenereerd!
-- 
-- Belangrijke informatie:
-- - Elke leerling heeft nu links voor de komende 8 weken
-- - Links verlopen automatisch na 2 weken
-- - Instructeurs kunnen SMS berichten versturen met deze links
-- - Leerlingen kunnen beschikbaarheid invullen via de persoonlijke links
--
-- Volgende stappen:
-- 1. Ga naar het leerlingoverzicht
-- 2. Klik op "SMS Leerlingen"
-- 3. Selecteer een week en leerlingen
-- 4. Verstuur SMS berichten met week-specifieke links 