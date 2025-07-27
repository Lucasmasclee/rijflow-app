-- ============================================================================
-- ENSURE AVAILABILITY LINKS FOR ALL STUDENTS
-- ============================================================================
-- Dit script zorgt ervoor dat elke leerling availability links heeft
-- voor de komende 8 weken (vanaf volgende week)
-- Als links ontbreken, worden deze automatisch aangemaakt

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
-- STAP 2: TOON HUIDIGE SITUATIE
-- ============================================================================

-- Toon hoeveel leerlingen er zijn
SELECT 
  'Totaal aantal leerlingen' as info,
  COUNT(*) as count
FROM students;

-- Toon huidige availability links per leerling
SELECT 
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  COUNT(al.id) as existing_links,
  CASE 
    WHEN COUNT(al.id) = 0 THEN 'GEEN LINKS'
    WHEN COUNT(al.id) < 8 THEN 'ONVOLLEDIG'
    ELSE 'COMPLEET'
  END as status
FROM students s
LEFT JOIN availability_links al ON s.id = al.student_id
GROUP BY s.id, s.first_name, s.last_name
ORDER BY s.first_name, s.last_name;

-- ============================================================================
-- STAP 3: GENEREER ONTBREKENDE LINKS
-- ============================================================================

-- Bereken de komende 8 weken (vanaf volgende week)
-- Gebruik maandag als startdag van de week
WITH week_starts AS (
  SELECT 
    (CURRENT_DATE + INTERVAL '1 week')::date + (1 - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '1 week')::date)::int) as week_start
  UNION ALL
  SELECT 
    (CURRENT_DATE + INTERVAL '2 weeks')::date + (1 - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '2 weeks')::date)::int)
  UNION ALL
  SELECT 
    (CURRENT_DATE + INTERVAL '3 weeks')::date + (1 - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '3 weeks')::date)::int)
  UNION ALL
  SELECT 
    (CURRENT_DATE + INTERVAL '4 weeks')::date + (1 - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '4 weeks')::date)::int)
  UNION ALL
  SELECT 
    (CURRENT_DATE + INTERVAL '5 weeks')::date + (1 - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '5 weeks')::date)::int)
  UNION ALL
  SELECT 
    (CURRENT_DATE + INTERVAL '6 weeks')::date + (1 - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '6 weeks')::date)::int)
  UNION ALL
  SELECT 
    (CURRENT_DATE + INTERVAL '7 weeks')::date + (1 - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '7 weeks')::date)::int)
  UNION ALL
  SELECT 
    (CURRENT_DATE + INTERVAL '8 weeks')::date + (1 - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '8 weeks')::date)::int)
),
all_students AS (
  SELECT DISTINCT s.id as student_id, s.first_name, s.last_name
  FROM students s
  WHERE s.id IS NOT NULL
),
missing_links AS (
  -- Vind ontbrekende links (combinaties van student en week die nog niet bestaan)
  SELECT 
    s.student_id,
    s.first_name,
    s.last_name,
    ws.week_start
  FROM all_students s
  CROSS JOIN week_starts ws
  WHERE NOT EXISTS (
    SELECT 1 
    FROM availability_links al 
    WHERE al.student_id = s.student_id 
    AND al.week_start = ws.week_start
  )
)
-- Genereer ontbrekende links
SELECT 
  'Creating missing link for: ' || ml.first_name || ' ' || COALESCE(ml.last_name, '') || 
  ' for week starting: ' || ml.week_start::text as info,
  create_availability_link(ml.student_id, ml.week_start::date) as generated_token
FROM missing_links ml
ORDER BY ml.first_name, ml.last_name, ml.week_start;

-- ============================================================================
-- STAP 4: TOON RESULTATEN NA GENERATIE
-- ============================================================================

-- Toon totaal aantal links
SELECT 
  'Totaal aantal availability links' as info,
  COUNT(*) as total_links
FROM availability_links;

-- Toon links per leerling na generatie
SELECT 
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  COUNT(al.id) as links_count,
  MIN(al.week_start) as earliest_week,
  MAX(al.week_start) as latest_week,
  CASE 
    WHEN COUNT(al.id) = 8 THEN '✓ COMPLEET'
    ELSE '⚠ ONVOLLEDIG (' || COUNT(al.id) || '/8)'
  END as status
FROM students s
LEFT JOIN availability_links al ON s.id = al.student_id
GROUP BY s.id, s.first_name, s.last_name
ORDER BY s.first_name, s.last_name;

-- Toon voorbeeld links voor de eerste leerling
SELECT 
  'Voorbeeld links voor: ' || s.first_name || ' ' || COALESCE(s.last_name, '') as student_info,
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
-- STAP 5: VERIFICATIE
-- ============================================================================

-- Controleer of alle leerlingen nu 8 links hebben
SELECT 
  'Leerlingen met onvolledige links' as info,
  COUNT(*) as count
FROM (
  SELECT s.id
  FROM students s
  LEFT JOIN availability_links al ON s.id = al.student_id
  GROUP BY s.id
  HAVING COUNT(al.id) < 8
) incomplete_students;

-- Controleer verlopen links
SELECT 
  'Verlopen links' as info,
  COUNT(*) as count
FROM availability_links
WHERE expires_at <= NOW();

-- Toon week-overzicht van beschikbare links
SELECT 
  week_start,
  COUNT(*) as available_links,
  COUNT(DISTINCT student_id) as unique_students
FROM availability_links
WHERE expires_at > NOW()
GROUP BY week_start
ORDER BY week_start;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- ✅ Availability links zijn succesvol gegenereerd voor alle leerlingen!
-- 
-- Belangrijke informatie:
-- - Elke leerling heeft nu links voor de komende 8 weken
-- - Links verlopen automatisch na 2 weken
-- - Instructeurs kunnen nu SMS berichten versturen met deze links
-- - Leerlingen kunnen beschikbaarheid invullen via de persoonlijke links
--
-- Volgende stappen voor SMS testing:
-- 1. Ga naar het leerlingoverzicht (/dashboard/students)
-- 2. Klik op "SMS Leerlingen" knop
-- 3. Selecteer een week en leerlingen
-- 4. Verstuur SMS berichten met week-specifieke links
-- 5. Test of leerlingen de juiste link ontvangen 