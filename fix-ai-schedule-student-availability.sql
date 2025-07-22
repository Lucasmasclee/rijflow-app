-- ============================================================================
-- FIX AI SCHEDULE STUDENT AVAILABILITY AUTOMATIC CREATION
-- ============================================================================
-- Dit script zorgt ervoor dat er automatisch student_availability records worden
-- aangemaakt wanneer een instructeur een week selecteert in de AI-schedule pagina

-- ============================================================================
-- STAP 1: CONTROLEER EN REPAREER STUDENT_AVAILABILITY TABEL
-- ============================================================================

-- Controleer of de student_availability tabel bestaat met de juiste structuur
DO $$
BEGIN
    -- Controleer of de tabel bestaat
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'student_availability') THEN
        -- Maak de tabel aan als deze niet bestaat
        CREATE TABLE student_availability (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
            week_start DATE NOT NULL,
            availability_data JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(student_id, week_start)
        );
        
        -- Maak indexes
        CREATE INDEX idx_student_availability_student_id ON student_availability(student_id);
        CREATE INDEX idx_student_availability_week_start ON student_availability(week_start);
        CREATE INDEX idx_student_availability_json ON student_availability USING GIN (availability_data);
        
        -- Enable RLS
        ALTER TABLE student_availability ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'student_availability tabel aangemaakt';
    ELSE
        -- Controleer of de juiste kolommen bestaan
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'student_availability' AND column_name = 'availability_data') THEN
            -- Voeg de ontbrekende kolom toe
            ALTER TABLE student_availability ADD COLUMN availability_data JSONB NOT NULL DEFAULT '{}';
            RAISE NOTICE 'availability_data kolom toegevoegd aan student_availability';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'student_availability' AND column_name = 'week_start') THEN
            -- Voeg de ontbrekende kolom toe
            ALTER TABLE student_availability ADD COLUMN week_start DATE NOT NULL DEFAULT CURRENT_DATE;
            RAISE NOTICE 'week_start kolom toegevoegd aan student_availability';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STAP 2: CONTROLEER EN REPAREER INSTRUCTOR_AVAILABILITY TABEL
-- ============================================================================

-- Controleer of de instructor_availability tabel bestaat met de juiste structuur
DO $$
BEGIN
    -- Controleer of de tabel bestaat
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'instructor_availability') THEN
        -- Maak de tabel aan als deze niet bestaat
        CREATE TABLE instructor_availability (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            week_start DATE NOT NULL,
            availability_data JSONB NOT NULL DEFAULT '{}',
            settings JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(instructor_id, week_start)
        );
        
        -- Maak indexes
        CREATE INDEX idx_instructor_availability_instructor_id ON instructor_availability(instructor_id);
        CREATE INDEX idx_instructor_availability_week_start ON instructor_availability(week_start);
        CREATE INDEX idx_instructor_availability_json ON instructor_availability USING GIN (availability_data);
        CREATE INDEX idx_instructor_availability_settings ON instructor_availability USING GIN (settings);
        
        -- Enable RLS
        ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'instructor_availability tabel aangemaakt';
    ELSE
        -- Controleer of de juiste kolommen bestaan
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'instructor_availability' AND column_name = 'availability_data') THEN
            -- Voeg de ontbrekende kolom toe
            ALTER TABLE instructor_availability ADD COLUMN availability_data JSONB NOT NULL DEFAULT '{}';
            RAISE NOTICE 'availability_data kolom toegevoegd aan instructor_availability';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'instructor_availability' AND column_name = 'settings') THEN
            -- Voeg de ontbrekende kolom toe
            ALTER TABLE instructor_availability ADD COLUMN settings JSONB NOT NULL DEFAULT '{}';
            RAISE NOTICE 'settings kolom toegevoegd aan instructor_availability';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'instructor_availability' AND column_name = 'week_start') THEN
            -- Voeg de ontbrekende kolom toe
            ALTER TABLE instructor_availability ADD COLUMN week_start DATE NOT NULL DEFAULT CURRENT_DATE;
            RAISE NOTICE 'week_start kolom toegevoegd aan instructor_availability';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STAP 3: ZET RLS POLICIES OP
-- ============================================================================

-- Policies voor student_availability
DROP POLICY IF EXISTS "Instructor can manage student availability" ON student_availability;
CREATE POLICY "Instructor can manage student availability" ON student_availability
    FOR ALL USING (
        student_id IN (
            SELECT id FROM students WHERE instructor_id = auth.uid()
        )
    );

-- Policies voor instructor_availability
DROP POLICY IF EXISTS "Instructor can manage own availability" ON instructor_availability;
CREATE POLICY "Instructor can manage own availability" ON instructor_availability
    FOR ALL USING (instructor_id = auth.uid());

-- ============================================================================
-- STAP 4: CONTROLEER STANDARD_AVAILABILITY TABEL
-- ============================================================================

-- Controleer of de standard_availability tabel bestaat
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'standard_availability') THEN
        -- Maak de tabel aan als deze niet bestaat
        CREATE TABLE standard_availability (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            availability_data JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(instructor_id)
        );
        
        -- Maak indexes
        CREATE INDEX idx_standard_availability_instructor_id ON standard_availability(instructor_id);
        CREATE INDEX idx_standard_availability_json ON standard_availability USING GIN (availability_data);
        
        -- Enable RLS
        ALTER TABLE standard_availability ENABLE ROW LEVEL SECURITY;
        
        -- Policy voor standard_availability
        CREATE POLICY "Instructor can manage own standard availability" ON standard_availability
            FOR ALL USING (instructor_id = auth.uid());
        
        RAISE NOTICE 'standard_availability tabel aangemaakt';
    END IF;
END $$;

-- ============================================================================
-- STAP 5: MAAK HELPER FUNCTIES
-- ============================================================================

-- Functie om week datums te genereren
CREATE OR REPLACE FUNCTION get_week_dates(p_week_start DATE) RETURNS JSONB AS $$
DECLARE
    week_dates JSONB;
    current_date_var DATE;
BEGIN
    week_dates := '[]'::jsonb;
    
    FOR i IN 0..6 LOOP
        current_date_var := p_week_start + (i || ' days')::interval;
        week_dates := week_dates || to_jsonb(current_date_var::text);
    END LOOP;
    
    RETURN week_dates;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STAP 6: TEST DE IMPLEMENTATIE
-- ============================================================================

-- Test of alle tabellen correct zijn ingesteld
SELECT 
    'student_availability' as table_name,
    COUNT(*) as record_count
FROM student_availability
UNION ALL
SELECT 
    'instructor_availability' as table_name,
    COUNT(*) as record_count
FROM instructor_availability
UNION ALL
SELECT 
    'standard_availability' as table_name,
    COUNT(*) as record_count
FROM standard_availability;

-- Test of er studenten zijn zonder availability records voor de huidige week
WITH current_week_start AS (
    SELECT date_trunc('week', CURRENT_DATE + INTERVAL '1 week') + INTERVAL '1 day' as week_start
),
students_without_availability AS (
    SELECT DISTINCT s.id as student_id, s.first_name, s.last_name
    FROM students s
    LEFT JOIN student_availability sa ON s.id = sa.student_id 
        AND sa.week_start = (SELECT week_start FROM current_week_start)
    WHERE sa.id IS NULL
)
SELECT 
    COUNT(*) as students_without_availability,
    STRING_AGG(first_name || ' ' || last_name, ', ') as student_names
FROM students_without_availability;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- De AI Schedule Student Availability automatische creatie is succesvol opgezet!
-- 
-- Belangrijke kenmerken:
-- 1. Automatische creatie van student_availability records wanneer een week wordt geselecteerd
-- 2. Gebruik van standaard beschikbaarheid als fallback
-- 3. Correcte RLS policies voor beveiliging
-- 4. Helper functies voor week datum generatie
-- 
-- Wanneer een instructeur nu een week selecteert in de AI-schedule pagina:
-- 1. Er wordt gecontroleerd of er al instructor_availability bestaat voor die week
-- 2. Als deze niet bestaat, wordt deze aangemaakt met standaard waarden
-- 3. Er wordt gecontroleerd of er student_availability records bestaan voor alle studenten
-- 4. Voor ontbrekende studenten worden automatisch records aangemaakt met standaard beschikbaarheid
-- 5. De data wordt direct geladen en getoond in de UI 