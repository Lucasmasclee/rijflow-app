-- ============================================================================
-- COMPLETE AI SCHEDULE AUTOMATIC SETUP
-- ============================================================================
-- Dit script zorgt ervoor dat alle tabellen automatisch correct worden opgezet
-- met de juiste foreign keys, kolommen en RLS policies
-- Voer dit script uit in je Supabase SQL editor

-- ============================================================================
-- STAP 1: CONTROLEER EN REPAREER STUDENTS TABEL
-- ============================================================================

-- Zorg ervoor dat de students tabel de juiste kolommen heeft
DO $$
BEGIN
    -- Voeg ontbrekende kolommen toe aan students tabel
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'instructor_id') THEN
        ALTER TABLE students ADD COLUMN instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'user_id') THEN
        ALTER TABLE students ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'default_lessons_per_week') THEN
        ALTER TABLE students ADD COLUMN default_lessons_per_week INTEGER DEFAULT 2;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'default_lesson_duration_minutes') THEN
        ALTER TABLE students ADD COLUMN default_lesson_duration_minutes INTEGER DEFAULT 60;
    END IF;
    
    -- Maak indexes aan als ze niet bestaan
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'students' AND indexname = 'idx_students_instructor_id') THEN
        CREATE INDEX idx_students_instructor_id ON students(instructor_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'students' AND indexname = 'idx_students_user_id') THEN
        CREATE INDEX idx_students_user_id ON students(user_id);
    END IF;
    
    RAISE NOTICE 'Students table structure verified and updated';
END $$;

-- ============================================================================
-- STAP 2: MAAK INSTRUCTOR_AVAILABILITY TABEL AAN
-- ============================================================================

-- Drop de oude tabel als deze bestaat (dit verwijdert ook alle data)
DROP TABLE IF EXISTS instructor_availability CASCADE;

-- Maak nieuwe instructor_availability tabel met correcte structuur
CREATE TABLE instructor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  week_start DATE NOT NULL,
  availability_data JSONB NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_instructor_availability_instructor_id 
    FOREIGN KEY (instructor_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Unique constraint
  CONSTRAINT unique_instructor_week UNIQUE(instructor_id, week_start)
);

-- Maak indexes voor betere performance
CREATE INDEX idx_instructor_availability_instructor_id ON instructor_availability(instructor_id);
CREATE INDEX idx_instructor_availability_week_start ON instructor_availability(week_start);
CREATE INDEX idx_instructor_availability_json ON instructor_availability USING GIN (availability_data);
CREATE INDEX idx_instructor_availability_settings ON instructor_availability USING GIN (settings);

-- Enable RLS
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STAP 3: MAAK STUDENT_AVAILABILITY TABEL AAN
-- ============================================================================

-- Drop de oude tabel als deze bestaat (dit verwijdert ook alle data)
DROP TABLE IF EXISTS student_availability CASCADE;

-- Maak nieuwe student_availability tabel met correcte structuur
CREATE TABLE student_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  week_start DATE NOT NULL,
  availability_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_student_availability_student_id 
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  
  -- Unique constraint
  CONSTRAINT unique_student_week UNIQUE(student_id, week_start)
);

-- Maak indexes voor betere performance
CREATE INDEX idx_student_availability_student_id ON student_availability(student_id);
CREATE INDEX idx_student_availability_week_start ON student_availability(week_start);
CREATE INDEX idx_student_availability_json ON student_availability USING GIN (availability_data);

-- Enable RLS
ALTER TABLE student_availability ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STAP 4: MAAK STANDARD_AVAILABILITY TABEL AAN
-- ============================================================================

-- Drop de oude tabel als deze bestaat (dit verwijdert ook alle data)
DROP TABLE IF EXISTS standard_availability CASCADE;

-- Maak nieuwe standard_availability tabel met correcte structuur
CREATE TABLE standard_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  availability_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_standard_availability_instructor_id 
    FOREIGN KEY (instructor_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Unique constraint
  CONSTRAINT unique_instructor_standard UNIQUE(instructor_id)
);

-- Maak indexes voor betere performance
CREATE INDEX idx_standard_availability_instructor_id ON standard_availability(instructor_id);
CREATE INDEX idx_standard_availability_json ON standard_availability USING GIN (availability_data);

-- Enable RLS
ALTER TABLE standard_availability ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STAP 5: MAAK INSTRUCTOR_AI_SETTINGS TABEL AAN
-- ============================================================================

-- Drop de oude tabel als deze bestaat (dit verwijdert ook alle data)
DROP TABLE IF EXISTS instructor_ai_settings CASCADE;

-- Maak nieuwe instructor_ai_settings tabel met correcte structuur
CREATE TABLE instructor_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  pauze_tussen_lessen INTEGER DEFAULT 10,
  lange_pauze_duur INTEGER DEFAULT 0,
  locaties_koppelen BOOLEAN DEFAULT true,
  blokuren BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_instructor_ai_settings_instructor_id 
    FOREIGN KEY (instructor_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Unique constraint
  CONSTRAINT unique_instructor_ai_settings UNIQUE(instructor_id)
);

-- Maak indexes voor betere performance
CREATE INDEX idx_instructor_ai_settings_instructor_id ON instructor_ai_settings(instructor_id);

-- Enable RLS
ALTER TABLE instructor_ai_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STAP 6: VERWIJDER ALLE BESTAANDE POLICIES
-- ============================================================================

-- Verwijder alle bestaande policies om conflicten te voorkomen
DROP POLICY IF EXISTS "Instructor can manage own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructor can manage student availability" ON student_availability;
DROP POLICY IF EXISTS "Student can view own availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can manage own standard availability" ON standard_availability;
DROP POLICY IF EXISTS "Instructor can manage own AI settings" ON instructor_ai_settings;

-- ============================================================================
-- STAP 7: MAAK NIEUWE RLS POLICIES
-- ============================================================================

-- 1. INSTRUCTOR_AVAILABILITY POLICIES
-- Policy voor instructeurs om hun eigen availability te beheren
CREATE POLICY "Instructor can manage own availability" ON instructor_availability
    FOR ALL USING (
        auth.uid() IS NOT NULL 
        AND instructor_id = auth.uid()
    );

-- 2. STUDENT_AVAILABILITY POLICIES
-- Policy voor instructeurs om availability van hun studenten te beheren
CREATE POLICY "Instructor can manage student availability" ON student_availability
    FOR ALL USING (
        auth.uid() IS NOT NULL 
        AND student_id IN (
            SELECT id FROM students WHERE instructor_id = auth.uid()
        )
    );

-- Policy voor studenten om hun eigen availability te bekijken (voor toekomstig gebruik)
CREATE POLICY "Student can view own availability" ON student_availability
    FOR SELECT USING (
        auth.uid() IS NOT NULL 
        AND student_id IN (
            SELECT id FROM students WHERE user_id = auth.uid()
        )
    );

-- 3. STANDARD_AVAILABILITY POLICIES
-- Policy voor instructeurs om hun eigen standard availability te beheren
CREATE POLICY "Instructor can manage own standard availability" ON standard_availability
    FOR ALL USING (
        auth.uid() IS NOT NULL 
        AND instructor_id = auth.uid()
    );

-- 4. INSTRUCTOR_AI_SETTINGS POLICIES
-- Policy voor instructeurs om hun eigen AI settings te beheren
CREATE POLICY "Instructor can manage own AI settings" ON instructor_ai_settings
    FOR ALL USING (
        auth.uid() IS NOT NULL 
        AND instructor_id = auth.uid()
    );

-- ============================================================================
-- STAP 8: MAAK HELPER FUNCTIES
-- ============================================================================

-- Functie om standaard beschikbaarheid op te halen voor een instructeur
CREATE OR REPLACE FUNCTION get_standard_availability(p_instructor_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT availability_data INTO result
    FROM standard_availability
    WHERE instructor_id = p_instructor_id;
    
    -- Return default availability if none exists
    IF result IS NULL THEN
        result := '{
            "maandag": ["09:00", "17:00"],
            "dinsdag": ["09:00", "17:00"],
            "woensdag": ["09:00", "17:00"],
            "donderdag": ["09:00", "17:00"],
            "vrijdag": ["09:00", "17:00"]
        }'::jsonb;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om week datums te genereren
CREATE OR REPLACE FUNCTION get_week_dates(p_week_start DATE)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '[]'::jsonb;
    loop_date DATE;
BEGIN
    loop_date := p_week_start;
    
    FOR i IN 0..6 LOOP
        result := result || to_jsonb(loop_date);
        loop_date := loop_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STAP 9: MAAK DEFAULT DATA VOOR BESTAANDE INSTRUCTEURS
-- ============================================================================

-- Voeg default standard_availability toe voor instructeurs die er nog geen hebben
INSERT INTO standard_availability (instructor_id, availability_data)
SELECT 
    DISTINCT s.instructor_id,
    '{
        "maandag": ["09:00", "17:00"],
        "dinsdag": ["09:00", "17:00"],
        "woensdag": ["09:00", "17:00"],
        "donderdag": ["09:00", "17:00"],
        "vrijdag": ["09:00", "17:00"]
    }'::jsonb
FROM students s
WHERE s.instructor_id IS NOT NULL
  AND s.instructor_id NOT IN (
    SELECT instructor_id FROM standard_availability
  )
ON CONFLICT (instructor_id) DO NOTHING;

-- Voeg default AI settings toe voor instructeurs die er nog geen hebben
INSERT INTO instructor_ai_settings (instructor_id, pauze_tussen_lessen, lange_pauze_duur, locaties_koppelen, blokuren)
SELECT 
    DISTINCT s.instructor_id,
    10, -- pauze_tussen_lessen
    0,  -- lange_pauze_duur
    true, -- locaties_koppelen
    true  -- blokuren
FROM students s
WHERE s.instructor_id IS NOT NULL
  AND s.instructor_id NOT IN (
    SELECT instructor_id FROM instructor_ai_settings
  )
ON CONFLICT (instructor_id) DO NOTHING;

-- ============================================================================
-- STAP 10: VERIFICATIE EN TESTING
-- ============================================================================

-- Controleer of alle tabellen correct zijn aangemaakt
SELECT 
    'TABLE STRUCTURE' as check_type,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('instructor_availability', 'student_availability', 'standard_availability', 'instructor_ai_settings')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Controleer of alle foreign keys correct zijn
SELECT 
    'FOREIGN KEYS' as check_type,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('instructor_availability', 'student_availability', 'standard_availability', 'instructor_ai_settings')
ORDER BY tc.table_name, kcu.column_name;

-- Controleer of alle policies correct zijn aangemaakt
SELECT 
    'RLS POLICIES' as check_type,
    tablename,
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename IN ('instructor_availability', 'student_availability', 'standard_availability', 'instructor_ai_settings')
ORDER BY tablename, policyname;

-- Controleer hoeveel records er zijn in elke tabel
SELECT 
    'DATA COUNT' as check_type,
    'instructor_availability' as table_name,
    COUNT(*) as record_count
FROM instructor_availability
UNION ALL
SELECT 
    'DATA COUNT',
    'student_availability',
    COUNT(*)
FROM student_availability
UNION ALL
SELECT 
    'DATA COUNT',
    'standard_availability',
    COUNT(*)
FROM standard_availability
UNION ALL
SELECT 
    'DATA COUNT',
    'instructor_ai_settings',
    COUNT(*)
FROM instructor_ai_settings;

-- Test of de helper functies werken
SELECT 
    'HELPER FUNCTIONS' as check_type,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'User authenticated'
        ELSE 'User not authenticated'
    END as auth_status,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN get_standard_availability(auth.uid())::text
        ELSE 'N/A'
    END as standard_availability;

-- ============================================================================
-- STAP 11: TEST INSERT (OPTIONEEL)
-- ============================================================================

-- Test insert voor instructor_availability (uncomment om te testen)
/*
DO $$
DECLARE
    test_week_start DATE := '2025-07-28'::date;
    current_user_id UUID;
BEGIN
    -- Haal huidige gebruiker ID op
    current_user_id := auth.uid();
    
    IF current_user_id IS NOT NULL THEN
        -- Test insert
        INSERT INTO instructor_availability (
            instructor_id,
            week_start,
            availability_data,
            settings
        ) VALUES (
            current_user_id,
            test_week_start,
            '{
                "maandag": ["09:00", "17:00"],
                "dinsdag": ["09:00", "17:00"],
                "woensdag": ["09:00", "17:00"],
                "donderdag": ["09:00", "17:00"],
                "vrijdag": ["09:00", "17:00"]
            }'::jsonb,
            '{
                "maxLessenPerDag": 6,
                "blokuren": true,
                "pauzeTussenLessen": 10,
                "langePauzeDuur": 0,
                "locatiesKoppelen": true
            }'::jsonb
        ) ON CONFLICT (instructor_id, week_start) DO NOTHING;
        
        RAISE NOTICE 'Test insert successful for instructor % and week %', current_user_id, test_week_start;
    ELSE
        RAISE NOTICE 'No authenticated user found';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;
*/

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- ✅ COMPLETE AI SCHEDULE AUTOMATIC SETUP VOLTOOID!
-- 
-- Belangrijke wijzigingen:
-- 1. Alle tabellen zijn opnieuw aangemaakt met correcte structuur
-- 2. Alle foreign keys zijn correct geconfigureerd
-- 3. Alle RLS policies zijn opnieuw aangemaakt
-- 4. Helper functies zijn toegevoegd
-- 5. Default data is toegevoegd voor bestaande instructeurs
-- 
-- Tabel structuur:
-- - instructor_availability: instructor_id -> auth.users(id)
-- - student_availability: student_id -> students(id)
-- - standard_availability: instructor_id -> auth.users(id)
-- - instructor_ai_settings: instructor_id -> auth.users(id)
-- 
-- RLS Policies:
-- - Instructeurs kunnen hun eigen availability beheren
-- - Instructeurs kunnen availability van hun studenten beheren
-- - Instructeurs kunnen hun eigen standard availability beheren
-- - Instructeurs kunnen hun eigen AI settings beheren
-- 
-- Test de functionaliteit door:
-- 1. In te loggen als instructeur
-- 2. Naar de AI-schedule pagina te gaan
-- 3. Een week te selecteren
-- 4. Door alle stappen te navigeren
-- 5. Te controleren of er geen 403 errors zijn
-- 
-- Als er nog steeds problemen zijn:
-- 1. Controleer de verificatie queries hierboven
-- 2. Zorg ervoor dat je ingelogd bent als instructeur
-- 3. Controleer of je studenten hebt toegevoegd
-- 4. Test de helper functies 