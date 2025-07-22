-- Tijdelijke fix voor RLS issue - schakel RLS uit
-- ⚠️ WAARSCHUWING: Dit is NIET veilig voor productie!
-- Gebruik dit alleen voor testing en ontwikkeling

-- ============================================================================
-- STAP 1: SCHAKEL RLS UIT
-- ============================================================================

-- Schakel RLS uit op instructor_availability
ALTER TABLE instructor_availability DISABLE ROW LEVEL SECURITY;

-- Schakel RLS uit op student_availability (voor de zekerheid)
ALTER TABLE student_availability DISABLE ROW LEVEL SECURITY;

-- Schakel RLS uit op standard_availability (voor de zekerheid)
ALTER TABLE standard_availability DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STAP 2: CONTROLEER STATUS
-- ============================================================================

-- Controleer of RLS uit staat
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('instructor_availability', 'student_availability', 'standard_availability')
ORDER BY tablename;

-- ============================================================================
-- STAP 3: TEST INSERT
-- ============================================================================

-- Test een insert om te controleren of het werkt
-- Vervang 'your-user-id' met je eigen user ID (je kunt een willekeurige UUID gebruiken)

-- INSERT INTO instructor_availability (
--   instructor_id,
--   week_start,
--   availability_data,
--   settings
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000001'::uuid,  -- Test user ID
--   '2025-01-20'::date,
--   '{"maandag": ["09:00", "17:00"]}'::jsonb,
--   '{"maxLessenPerDag": 6}'::jsonb
-- );

-- ============================================================================
-- STAP 4: CONTROLEER RESULTAAT
-- ============================================================================

-- Controleer of de insert is gelukt
SELECT 
  COUNT(*) as total_records
FROM instructor_availability;

-- ============================================================================
-- BELANGRIJK: HERSTEL RLS NA TESTING
-- ============================================================================

-- Na het testen, zet RLS weer aan met deze commando's:

-- ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE student_availability ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE standard_availability ENABLE ROW LEVEL SECURITY;

-- En maak nieuwe policies aan:

-- CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
--   FOR ALL USING (auth.uid() = instructor_id);

-- CREATE POLICY "Students can manage own availability" ON student_availability
--   FOR ALL USING (
--     auth.uid() IN (
--       SELECT user_id FROM students WHERE id = student_availability.student_id
--     )
--   );

-- CREATE POLICY "Instructors can manage their own standard availability" ON standard_availability
--   FOR ALL USING (auth.uid() = instructor_id); 