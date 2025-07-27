-- ============================================================================
-- COMPREHENSIVE AI SCHEDULE RLS FIX
-- ============================================================================
-- Dit script repareert alle RLS policies en tabel configuraties voor de AI schedule functionaliteit
-- Voer dit script uit in je Supabase SQL editor

-- ============================================================================
-- STAP 1: CONTROLEER HUIDIGE SITUATIE
-- ============================================================================

-- Controleer welke tabellen bestaan
SELECT 
    'TABLE STATUS' as check_type,
    table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = t.table_name 
        AND table_schema = 'public'
    ) as table_exists
FROM (VALUES 
    ('student_availability'),
    ('instructor_availability'),
    ('standard_availability'),
    ('students'),
    ('instructor_ai_settings')
) as t(table_name)
ORDER BY table_name;

-- Controleer RLS status voor alle tabellen
SELECT 
    'RLS STATUS' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('student_availability', 'instructor_availability', 'standard_availability')
ORDER BY tablename;

-- ============================================================================
-- STAP 2: ZORG ERVOOR DAT ALLE TABELLEN BESTAAN MET JUISTE STRUCTUUR
-- ============================================================================

-- 1. STUDENT_AVAILABILITY TABEL
CREATE TABLE IF NOT EXISTS student_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  availability_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, week_start)
);

-- Maak indexes voor student_availability
CREATE INDEX IF NOT EXISTS idx_student_availability_student_id ON student_availability(student_id);
CREATE INDEX IF NOT EXISTS idx_student_availability_week_start ON student_availability(week_start);
CREATE INDEX IF NOT EXISTS idx_student_availability_json ON student_availability USING GIN (availability_data);

-- 2. INSTRUCTOR_AVAILABILITY TABEL
CREATE TABLE IF NOT EXISTS instructor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  availability_data JSONB NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instructor_id, week_start)
);

-- Maak indexes voor instructor_availability
CREATE INDEX IF NOT EXISTS idx_instructor_availability_instructor_id ON instructor_availability(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_availability_week_start ON instructor_availability(week_start);
CREATE INDEX IF NOT EXISTS idx_instructor_availability_json ON instructor_availability USING GIN (availability_data);
CREATE INDEX IF NOT EXISTS idx_instructor_availability_settings ON instructor_availability USING GIN (settings);

-- 3. STANDARD_AVAILABILITY TABEL
CREATE TABLE IF NOT EXISTS standard_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  availability_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instructor_id)
);

-- Maak indexes voor standard_availability
CREATE INDEX IF NOT EXISTS idx_standard_availability_instructor_id ON standard_availability(instructor_id);
CREATE INDEX IF NOT EXISTS idx_standard_availability_json ON standard_availability USING GIN (availability_data);

-- 4. INSTRUCTOR_AI_SETTINGS TABEL
CREATE TABLE IF NOT EXISTS instructor_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pauze_tussen_lessen INTEGER DEFAULT 10,
  lange_pauze_duur INTEGER DEFAULT 0,
  locaties_koppelen BOOLEAN DEFAULT true,
  blokuren BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instructor_id)
);

-- Maak indexes voor instructor_ai_settings
CREATE INDEX IF NOT EXISTS idx_instructor_ai_settings_instructor_id ON instructor_ai_settings(instructor_id);

-- ============================================================================
-- STAP 3: ENABLE RLS OP ALLE TABELLEN
-- ============================================================================

ALTER TABLE student_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_ai_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STAP 4: VERWIJDER ALLE BESTAANDE POLICIES
-- ============================================================================

-- Student availability policies
DROP POLICY IF EXISTS "Student can manage own availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can view student availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can manage student availability" ON student_availability;
DROP POLICY IF EXISTS "Student can view own availability" ON student_availability;
DROP POLICY IF EXISTS "Instructor can manage their students availability" ON student_availability;
DROP POLICY IF EXISTS "Public token access for availability" ON student_availability;

-- Instructor availability policies
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;
DROP POLICY IF EXISTS "Instructor can manage own availability" ON instructor_availability;

-- Standard availability policies
DROP POLICY IF EXISTS "Instructors can manage their own standard availability" ON standard_availability;
DROP POLICY IF EXISTS "Instructor can manage own standard availability" ON standard_availability;

-- Instructor AI settings policies
DROP POLICY IF EXISTS "Instructors can manage their own AI settings" ON instructor_ai_settings;
DROP POLICY IF EXISTS "Instructor can manage own AI settings" ON instructor_ai_settings;

-- ============================================================================
-- STAP 5: MAAK NIEUWE PRODUCTIE POLICIES
-- ============================================================================

-- 1. STUDENT_AVAILABILITY POLICIES
-- Policy voor instructeurs om availability van hun studenten te beheren
CREATE POLICY "Instructor can manage student availability" ON student_availability
    FOR ALL USING (
        student_id IN (
            SELECT id FROM students WHERE instructor_id = auth.uid()
        )
    );

-- Policy voor studenten om hun eigen availability te bekijken (voor toekomstig gebruik)
CREATE POLICY "Student can view own availability" ON student_availability
    FOR SELECT USING (
        student_id IN (
            SELECT id FROM students WHERE user_id = auth.uid()
        )
    );

-- 2. INSTRUCTOR_AVAILABILITY POLICIES
-- Policy voor instructeurs om hun eigen availability te beheren
CREATE POLICY "Instructor can manage own availability" ON instructor_availability
    FOR ALL USING (auth.uid() = instructor_id);

-- 3. STANDARD_AVAILABILITY POLICIES
-- Policy voor instructeurs om hun eigen standard availability te beheren
CREATE POLICY "Instructor can manage own standard availability" ON standard_availability
    FOR ALL USING (auth.uid() = instructor_id);

-- 4. INSTRUCTOR_AI_SETTINGS POLICIES
-- Policy voor instructeurs om hun eigen AI settings te beheren
CREATE POLICY "Instructor can manage own AI settings" ON instructor_ai_settings
    FOR ALL USING (auth.uid() = instructor_id);

-- ============================================================================
-- STAP 6: MAAK HELPER FUNCTIES
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
-- STAP 7: MAAK DEFAULT DATA VOOR BESTAANDE INSTRUCTEURS
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
WHERE s.instructor_id NOT IN (
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
WHERE s.instructor_id NOT IN (
    SELECT instructor_id FROM instructor_ai_settings
)
ON CONFLICT (instructor_id) DO NOTHING;

-- ============================================================================
-- STAP 8: VERIFICATIE
-- ============================================================================

-- Controleer of alle policies correct zijn aangemaakt
SELECT 
    'POLICIES VERIFICATION' as check_type,
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename IN ('student_availability', 'instructor_availability', 'standard_availability', 'instructor_ai_settings')
ORDER BY tablename, policyname;

-- Controleer hoeveel records er zijn in elke tabel
SELECT 
    'DATA COUNT' as check_type,
    'student_availability' as table_name,
    COUNT(*) as record_count
FROM student_availability
UNION ALL
SELECT 
    'DATA COUNT',
    'instructor_availability',
    COUNT(*)
FROM instructor_availability
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
    get_standard_availability(auth.uid()) as current_user_standard_availability;

-- ============================================================================
-- STAP 9: TEST INSERT (OPTIONEEL)
-- ============================================================================

-- Test insert voor instructor_availability (uncomment om te testen)
/*
DO $$
DECLARE
    test_week_start DATE := '2025-07-28'::date;
BEGIN
    INSERT INTO instructor_availability (
        instructor_id,
        week_start,
        availability_data,
        settings
    ) VALUES (
        auth.uid(),
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
    
    RAISE NOTICE 'Test insert successful for instructor % and week %', auth.uid(), test_week_start;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;
*/

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- ✅ COMPREHENSIVE AI SCHEDULE RLS FIX VOLTOOID!
-- 
-- Belangrijke wijzigingen:
-- 1. Alle tabellen zijn gecontroleerd en aangemaakt indien nodig
-- 2. Alle RLS policies zijn opnieuw geconfigureerd
-- 3. Helper functies zijn toegevoegd
-- 4. Default data is toegevoegd voor bestaande instructeurs
-- 
-- Instructeurs kunnen nu:
-- - Hun eigen availability records beheren
-- - Availability records van hun studenten beheren
-- - Standard availability instellen
-- - AI settings configureren
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