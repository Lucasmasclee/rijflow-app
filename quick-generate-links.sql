-- ============================================================================
-- QUICK GENERATE AVAILABILITY LINKS
-- ============================================================================
-- Eenvoudig script om week-specifieke beschikbaarheid links te genereren
-- voor alle leerlingen voor de komende 8 weken

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
  SELECT DISTINCT s.id as student_id
  FROM students s
  WHERE s.id IS NOT NULL
)
-- Genereer links voor alle leerlingen voor alle weken
SELECT create_availability_link(s.student_id, ws.week_start::date)
FROM all_students s
CROSS JOIN week_starts ws;

-- Toon resultaat
SELECT 
  'Links generated successfully' as status,
  COUNT(*) as total_links
FROM availability_links; 