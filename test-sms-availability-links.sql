-- ============================================================================
-- TEST SMS AVAILABILITY LINKS FUNCTIONALITY
-- ============================================================================
-- Dit script test de SMS beschikbaarheid links functionaliteit
-- en toont hoe je de juiste links kunt ophalen voor specifieke leerlingen en weken

-- ============================================================================
-- STAP 1: CONTROLEER BESCHIKBARE LINKS
-- ============================================================================

-- Toon alle beschikbare links voor de komende weken
SELECT 
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  s.phone,
  al.week_start,
  al.token,
  al.expires_at,
  'https://rijflow.nl/beschikbaarheid/' || al.token as full_url
FROM students s
JOIN availability_links al ON s.id = al.student_id
WHERE al.expires_at > NOW()
ORDER BY s.first_name, s.last_name, al.week_start;

-- ============================================================================
-- STAP 2: TEST SPECIFIEKE WEEK SELECTIE
-- ============================================================================

-- Test: Toon alle links voor een specifieke week (volgende week)
WITH next_week AS (
  SELECT (CURRENT_DATE + INTERVAL '1 week')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '1 week')::date)::int + 1 as week_start
)
SELECT 
  'Links voor volgende week (' || nw.week_start::text || ')' as week_info,
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  s.phone,
  al.token,
  'https://rijflow.nl/beschikbaarheid/' || al.token as sms_url
FROM students s
JOIN availability_links al ON s.id = al.student_id
CROSS JOIN next_week nw
WHERE al.week_start = nw.week_start
  AND al.expires_at > NOW()
ORDER BY s.first_name, s.last_name;

-- ============================================================================
-- STAP 3: TEST SPECIFIEKE LEERLING SELECTIE
-- ============================================================================

-- Test: Toon alle links voor een specifieke leerling
SELECT 
  'Alle links voor: ' || s.first_name || ' ' || COALESCE(s.last_name, '') as student_info,
  s.phone,
  al.week_start,
  al.token,
  'https://rijflow.nl/beschikbaarheid/' || al.token as sms_url
FROM students s
JOIN availability_links al ON s.id = al.student_id
WHERE s.id = (SELECT id FROM students ORDER BY first_name, last_name LIMIT 1)
  AND al.expires_at > NOW()
ORDER BY al.week_start;

-- ============================================================================
-- STAP 4: TEST COMBINATIE LEERLING + WEEK
-- ============================================================================

-- Test: Toon link voor specifieke leerling en specifieke week
WITH target_week AS (
  SELECT (CURRENT_DATE + INTERVAL '1 week')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '1 week')::date)::int + 1 as week_start
),
target_student AS (
  SELECT id, first_name, last_name, phone
  FROM students 
  ORDER BY first_name, last_name 
  LIMIT 1
)
SELECT 
  'SMS Link voor: ' || ts.first_name || ' ' || COALESCE(ts.last_name, '') || 
  ' - Week: ' || tw.week_start::text as sms_info,
  ts.phone as recipient_phone,
  al.token,
  'https://rijflow.nl/beschikbaarheid/' || al.token as full_url,
  al.expires_at
FROM target_student ts
JOIN availability_links al ON ts.id = al.student_id
CROSS JOIN target_week tw
WHERE al.week_start = tw.week_start
  AND al.expires_at > NOW();

-- ============================================================================
-- STAP 5: TEST MEERDERE LEERLINGEN VOOR EEN WEEK
-- ============================================================================

-- Test: Toon links voor meerdere leerlingen voor dezelfde week
WITH target_week AS (
  SELECT (CURRENT_DATE + INTERVAL '1 week')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '1 week')::date)::int + 1 as week_start
)
SELECT 
  'SMS Links voor week: ' || tw.week_start::text as week_info,
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  s.phone as recipient_phone,
  al.token,
  'https://rijflow.nl/beschikbaarheid/' || al.token as sms_url
FROM students s
JOIN availability_links al ON s.id = al.student_id
CROSS JOIN target_week tw
WHERE al.week_start = tw.week_start
  AND al.expires_at > NOW()
ORDER BY s.first_name, s.last_name;

-- ============================================================================
-- STAP 6: TEST SMS BERICHT FORMAT
-- ============================================================================

-- Test: Genereer voorbeeld SMS berichten
WITH target_week AS (
  SELECT (CURRENT_DATE + INTERVAL '1 week')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '1 week')::date)::int + 1 as week_start
)
SELECT 
  'SMS Bericht voor: ' || s.first_name || ' ' || COALESCE(s.last_name, '') as recipient,
  s.phone as phone_number,
  'Hallo ' || s.first_name || ', vul hier je beschikbaarheid in voor de week van ' || 
  to_char(tw.week_start, 'DD-MM-YYYY') || ': https://rijflow.nl/beschikbaarheid/' || al.token as sms_message
FROM students s
JOIN availability_links al ON s.id = al.student_id
CROSS JOIN target_week tw
WHERE al.week_start = tw.week_start
  AND al.expires_at > NOW()
ORDER BY s.first_name, s.last_name;

-- ============================================================================
-- STAP 7: VERIFICATIE EN CONTROLES
-- ============================================================================

-- Controleer of alle leerlingen links hebben voor de komende weken
SELECT 
  'Leerlingen zonder links voor komende weken' as check_type,
  COUNT(*) as count
FROM students s
WHERE NOT EXISTS (
  SELECT 1 
  FROM availability_links al 
  WHERE al.student_id = s.id 
  AND al.week_start >= (CURRENT_DATE + INTERVAL '1 week')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '1 week')::date)::int + 1
  AND al.expires_at > NOW()
);

-- Controleer verlopen links
SELECT 
  'Verlopen links' as check_type,
  COUNT(*) as count
FROM availability_links
WHERE expires_at <= NOW();

-- Toon week-overzicht
SELECT 
  'Week-overzicht beschikbare links' as check_type,
  week_start,
  COUNT(*) as total_links,
  COUNT(DISTINCT student_id) as unique_students
FROM availability_links
WHERE expires_at > NOW()
GROUP BY week_start
ORDER BY week_start;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- ✅ SMS Availability Links Test Script voltooid!
-- 
-- Dit script heeft getest:
-- 1. ✅ Beschikbare links voor alle leerlingen
-- 2. ✅ Week-specifieke link selectie
-- 3. ✅ Leerling-specifieke link selectie
-- 4. ✅ Combinatie leerling + week
-- 5. ✅ Meerdere leerlingen voor één week
-- 6. ✅ SMS bericht format
-- 7. ✅ Verificatie en controles
--
-- Voor de SMS functionaliteit in de app:
-- 1. Gebruik de queries uit stap 4-6 om de juiste links op te halen
-- 2. Stuur SMS berichten met de gegenereerde URLs
-- 3. Leerlingen kunnen via de links hun beschikbaarheid invullen
-- 4. De beschikbaarheid wordt opgeslagen in de student_availability tabel 