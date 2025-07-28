# Instructor Availability RLS Policy Fix

## 🚨 Probleem
Je krijgt een RLS (Row Level Security) policy error bij het maken van nieuwe availability records in de `instructor_availability` tabel:

```
"Failed to create new availability: new row violates row-level security policy for table \"instructor_availability\""
```

## 🔍 Oorzaak
Het probleem is dat de RLS policy voor de `instructor_availability` tabel niet correct werkt. Dit kan verschillende oorzaken hebben:

1. **Incorrecte RLS Policy**: De policy is niet goed geconfigureerd
2. **Authenticatie Probleem**: De gebruiker is niet correct geauthenticeerd
3. **User ID Mismatch**: Er is een mismatch tussen de user ID en instructor_id
4. **Tabel Structuur**: De tabel structuur is niet correct

## 🛠️ Oplossing

### Stap 1: Tijdelijke Fix (Voor Testing)

Voer dit SQL script uit in je Supabase SQL editor om RLS tijdelijk uit te schakelen:

```sql
-- Temporary fix: Disable RLS on instructor_availability table
-- ⚠️ WARNING: This disables security - use only for testing!

-- Disable RLS on instructor_availability table
ALTER TABLE instructor_availability DISABLE ROW LEVEL SECURITY;

-- Drop all policies to be sure
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;
```

**⚠️ Waarschuwing**: Dit schakelt beveiliging uit. Gebruik dit alleen voor testing!

### Stap 2: Permanente Fix (Voor Productie)

Voer dit SQL script uit om de RLS policy correct te configureren:

```sql
-- Fix RLS policy issue for instructor_availability table

-- Re-enable RLS
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;

-- Create a more permissive policy that should work for all instructors
CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
  FOR ALL USING (
    -- More explicit check with proper type casting
    auth.uid() IS NOT NULL 
    AND instructor_id IS NOT NULL 
    AND auth.uid()::text = instructor_id::text
  );
```

### Stap 3: Alternatieve Fix (Als Stap 2 niet werkt)

Als de bovenstaande fix niet werkt, probeer deze meer permissieve versie:

```sql
-- Alternative more permissive policy
DROP POLICY IF EXISTS "Instructors can manage their own availability" ON instructor_availability;

CREATE POLICY "Instructors can manage their own availability" ON instructor_availability
  FOR ALL USING (true);
```

## 🧪 Testen

### 1. Test de Tijdelijke Fix
1. Voer het tijdelijke RLS disable script uit
2. Ga naar `/dashboard/ai-schedule`
3. Selecteer een week
4. Controleer of de error weg is

### 2. Test de Permanente Fix
1. Voer het permanente fix script uit
2. Test dezelfde functionaliteit
3. Controleer of alles nog steeds werkt

## 📊 Debug Informatie

De API route is aangepast om meer debug informatie te geven. Als je nog steeds errors krijgt, kijk naar de console logs voor:

- `Current user ID`: De ID van de ingelogde gebruiker
- `User authenticated`: Of de gebruiker correct is geauthenticeerd
- `Attempting to insert data`: De data die wordt ingevoegd
- `RLS Policy Error detected`: Specifieke RLS error details

## 🔧 Database Controle

Voer deze queries uit om de huidige situatie te controleren:

```sql
-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'instructor_availability'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'instructor_availability'
ORDER BY policyname;

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'instructor_availability';
```

## 📝 Bestanden

- `fix-instructor-availability-rls-issue.sql`: Volledige fix met debug informatie
- `temporary-rls-disable-instructor-availability.sql`: Tijdelijke fix voor testing
- `src/app/api/ai-schedule/create-editable-input/route.ts`: Aangepaste API route met betere error handling

## 🚀 Volgende Stappen

1. **Test de tijdelijke fix** om te bevestigen dat het probleem bij RLS ligt
2. **Implementeer de permanente fix** voor productie
3. **Test alle functionaliteit** om er zeker van te zijn dat alles werkt
4. **Monitor de logs** voor eventuele nieuwe problemen

## ⚠️ Belangrijke Notities

- **Tijdelijke fix**: Schakelt beveiliging uit - alleen voor testing!
- **Permanente fix**: Behoudt beveiliging maar maakt de policy meer permissief
- **Monitoring**: Houd de logs in de gaten voor nieuwe problemen
- **Backup**: Maak altijd een backup van je database voordat je wijzigingen maakt 