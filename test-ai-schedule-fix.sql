-- Test script voor AI Schedule fix
-- Dit script test of de nieuwe functionaliteit werkt

-- 1. Controleer of de benodigde tabellen bestaan
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'instructor_availability' THEN 'Nieuwe JSON-gebaseerde tabel'
    WHEN table_name = 'instructor_ai_settings' THEN 'AI instellingen tabel'
    WHEN table_name = 'student_availability' THEN 'Student beschikbaarheid tabel'
    ELSE 'Andere tabel'
  END as tabel_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('instructor_availability', 'instructor_ai_settings', 'student_availability');

-- 2. Controleer of er instructeurs zijn
SELECT 
  id,
  email,
  created_at
FROM auth.users 
LIMIT 5;

-- 3. Controleer of er leerlingen zijn
SELECT 
  id,
  first_name,
  last_name,
  instructor_id,
  created_at
FROM students 
LIMIT 5;

-- 4. Controleer bestaande instructor_availability data
SELECT 
  instructor_id,
  week_start,
  availability_data,
  settings,
  created_at
FROM instructor_availability 
LIMIT 5;

-- 5. Controleer bestaande instructor_ai_settings data
SELECT 
  instructor_id,
  pauze_tussen_lessen,
  lange_pauze_duur,
  locaties_koppelen,
  blokuren,
  created_at
FROM instructor_ai_settings 
LIMIT 5;

-- 6. Test de get_ai_weekplanning_data functie (alleen als er instructeurs zijn)
DO $$
DECLARE
  instructor_uuid UUID;
  test_result JSONB;
BEGIN
  -- Haal een instructeur op die leerlingen heeft
  SELECT s.instructor_id INTO instructor_uuid
  FROM students s
  LIMIT 1;
  
  IF instructor_uuid IS NOT NULL THEN
    -- Test de functie met een toekomstige week
    SELECT get_ai_weekplanning_data(instructor_uuid, '2025-01-20'::date) INTO test_result;
    RAISE NOTICE 'get_ai_weekplanning_data test voor instructeur %: %', instructor_uuid, test_result;
  ELSE
    RAISE NOTICE 'Geen instructeurs met leerlingen gevonden voor test';
  END IF;
END $$; 