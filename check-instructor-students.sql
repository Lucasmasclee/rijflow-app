-- Script om te controleren of er leerlingen zijn voor een instructeur
-- Vervang 'your-instructor-id' met de daadwerkelijke instructor ID

-- Controleer of er leerlingen zijn voor de instructeur
SELECT 
  id,
  first_name,
  last_name,
  instructor_id,
  created_at
FROM students 
WHERE instructor_id = 'your-instructor-id'::uuid;

-- Controleer ook de instructor_availability tabel
SELECT 
  instructor_id,
  week_start,
  availability_data,
  settings
FROM instructor_availability 
WHERE instructor_id = 'your-instructor-id'::uuid;

-- Toon alle instructeurs (voor referentie)
SELECT 
  id,
  email,
  created_at
FROM auth.users 
WHERE id IN (
  SELECT DISTINCT instructor_id 
  FROM students
); 