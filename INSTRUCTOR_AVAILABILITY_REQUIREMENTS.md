# Instructor Availability Insert Requirements

## 🔍 Wat er nodig is voor een gebruiker om een insert te kunnen doen

Voor een gebruiker om een insert te kunnen doen in de `instructor_availability` tabel, moeten de volgende voorwaarden worden voldaan:

### 1. **Authenticatie**
- ✅ Gebruiker moet ingelogd zijn in Supabase Auth
- ✅ `auth.uid()` moet een geldige UUID retourneren
- ✅ Gebruiker moet bestaan in de `auth.users` tabel

### 2. **Tabel Structuur**
- ✅ `instructor_availability` tabel moet bestaan
- ✅ Tabel moet de juiste kolommen hebben:
  - `id` (UUID, PRIMARY KEY)
  - `instructor_id` (UUID, NOT NULL, REFERENCES auth.users)
  - `week_start` (DATE, NOT NULL)
  - `availability_data` (JSONB, NOT NULL)
  - `settings` (JSONB, NOT NULL)

### 3. **Row Level Security (RLS)**
- ✅ RLS moet correct geconfigureerd zijn
- ✅ Policy moet toegang geven aan de huidige gebruiker

### 4. **Database Permissions**
- ✅ Gebruiker moet INSERT privileges hebben op de tabel
- ✅ Gebruiker moet SELECT privileges hebben op de tabel

## 🛠️ Stap-voor-stap Diagnose

### Stap 1: Controleer Authenticatie
```sql
-- Controleer of er een ingelogde gebruiker is
SELECT auth.uid() as current_user_id;

-- Controleer of de gebruiker bestaat in auth.users
SELECT 
  id,
  email,
  created_at
FROM auth.users 
WHERE id = auth.uid();
```

### Stap 2: Controleer Tabel Structuur
```sql
-- Controleer tabel structuur
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'instructor_availability'
ORDER BY ordinal_position;
```

### Stap 3: Controleer RLS Status
```sql
-- Controleer of RLS is ingeschakeld
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'instructor_availability';

-- Controleer bestaande policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'instructor_availability'
ORDER BY policyname;
```

### Stap 4: Controleer Permissions
```sql
-- Controleer gebruikers permissions
SELECT 
  has_table_privilege(auth.uid(), 'instructor_availability', 'INSERT') as can_insert,
  has_table_privilege(auth.uid(), 'instructor_availability', 'SELECT') as can_select,
  has_table_privilege(auth.uid(), 'instructor_availability', 'UPDATE') as can_update,
  has_table_privilege(auth.uid(), 'instructor_availability', 'DELETE') as can_delete;
```

## 🚨 Mogelijke Problemen en Oplossingen

### Probleem 1: Geen ingelogde gebruiker
**Symptoom**: `auth.uid()` retourneert `NULL`
**Oplossing**: Zorg ervoor dat de gebruiker correct is ingelogd via Supabase Auth

### Probleem 2: Gebruiker bestaat niet in auth.users
**Symptoom**: Query op `auth.users` retourneert geen rijen
**Oplossing**: Controleer of de gebruiker correct is aangemaakt in Supabase Auth

### Probleem 3: RLS Policy is te restrictief
**Symptoom**: "new row violates row-level security policy" error
**Oplossing**: Voer het `complete-instructor-availability-fix.sql` script uit

### Probleem 4: Tabel bestaat niet of heeft verkeerde structuur
**Symptoom**: "relation does not exist" of "column does not exist" error
**Oplossing**: Voer het `fix-instructor-availability-table.sql` script uit

### Probleem 5: Geen database permissions
**Symptoom**: "permission denied" error
**Oplossing**: Controleer of de gebruiker de juiste rol heeft in Supabase

## 🔧 Snelle Fixes

### Fix 1: Tijdelijke RLS Disable (Voor Testing)
```sql
ALTER TABLE instructor_availability DISABLE ROW LEVEL SECURITY;
```

### Fix 2: Permissieve Policy
```sql
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;
CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
  FOR ALL USING (auth.uid() IS NOT NULL);
```

### Fix 3: Specifieke Policies
```sql
-- Insert policy
CREATE POLICY "Instructors can insert their own availability" ON instructor_availability
  FOR INSERT WITH CHECK (auth.uid() = instructor_id);

-- Select policy  
CREATE POLICY "Instructors can select their own availability" ON instructor_availability
  FOR SELECT USING (auth.uid() = instructor_id);
```

## 🧪 Test Scripts

### Test 1: Basis Insert Test
```sql
DO $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    INSERT INTO instructor_availability (
      instructor_id,
      week_start,
      availability_data,
      settings
    ) VALUES (
      current_user_id,
      '2025-01-20'::date,
      '{"maandag": ["09:00", "17:00"]}'::jsonb,
      '{"maxLessenPerDag": 6}'::jsonb
    );
    
    RAISE NOTICE 'SUCCESS: Insert worked';
    
    -- Clean up
    DELETE FROM instructor_availability 
    WHERE instructor_id = current_user_id 
      AND week_start = '2025-01-20'::date;
  ELSE
    RAISE NOTICE 'FAILED: No authenticated user';
  END IF;
END $$;
```

### Test 2: Volledige Diagnose
Voer het `check-user-setup-complete.sql` script uit voor een volledige diagnose.

## 📋 Checklist voor Productie

- [ ] Gebruiker is ingelogd in Supabase Auth
- [ ] Gebruiker bestaat in `auth.users` tabel
- [ ] `instructor_availability` tabel bestaat met juiste structuur
- [ ] RLS is ingeschakeld met correcte policies
- [ ] Gebruiker heeft de juiste database permissions
- [ ] API route gebruikt correcte authenticatie headers
- [ ] Test insert werkt in SQL editor
- [ ] Test insert werkt via API

## 🚀 Volgende Stappen

1. **Voer eerst de diagnose uit** met `check-user-setup-complete.sql`
2. **Identificeer het specifieke probleem** uit de resultaten
3. **Pas de juiste fix toe** op basis van het probleem
4. **Test de functionaliteit** via de API
5. **Monitor de logs** voor eventuele nieuwe problemen 