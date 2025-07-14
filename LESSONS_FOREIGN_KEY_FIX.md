# Lessons Foreign Key Fix - RijFlow App

## 🚨 Probleem
Je krijgt de volgende foutmelding bij het toevoegen van een les:
```
POST https://hdnuyrzlbawlbrcnatpz.supabase.co/rest/v1/lessons 409 (Conflict)
Error saving lesson: 
{code: '23503', details: 'Key is not present in table "users".', hint: null, message: 'insert or update on table "lessons" violates foreign key constraint "lessons_instructor_id_fkey"'}
```

## 🔍 Oorzaak
Het probleem is dat de `lessons` tabel een foreign key constraint heeft die verwijst naar een `users` tabel die niet correct is ingesteld. In Supabase wordt authenticatie afgehandeld door de ingebouwde `auth.users` tabel, niet door een custom `users` tabel.

## 🛠 Oplossing

### Optie 1: Volledige Reset (Aanbevolen als er nog geen lessen zijn)
Voer het volgende SQL script uit in je Supabase SQL Editor:

```sql
-- Zie fix-lessons-table-foreign-key.sql voor het volledige script
```

**Stappen:**
1. Ga naar je Supabase Dashboard
2. Ga naar SQL Editor
3. Kopieer en plak de inhoud van `fix-lessons-table-foreign-key.sql`
4. Klik op "Run"

### Optie 2: Behoud Bestaande Data
Als je al lessen hebt in de database en deze wilt behouden, gebruik dan:

```sql
-- Zie fix-lessons-foreign-key-alternative.sql voor het volledige script
```

**Stappen:**
1. Ga naar je Supabase Dashboard
2. Ga naar SQL Editor
3. Kopieer en plak de inhoud van `fix-lessons-foreign-key-alternative.sql`
4. Klik op "Run"

## 🔧 Wat de Scripts Doen

### Script 1: Volledige Reset
1. **Controleert** de huidige tabelstructuur
2. **Verwijdert** de bestaande `lessons` tabel (inclusief alle data)
3. **Maakt** een nieuwe `lessons` tabel met correcte foreign key constraints
4. **Maakt** performance indexes
5. **Schakelt** Row Level Security in
6. **Maakt** RLS policies aan
7. **Verifieert** de setup

### Script 2: Behoud Data
1. **Controleert** bestaande foreign key constraints
2. **Verwijdert** alleen de problematische foreign key constraint
3. **Voegt** de correcte foreign key constraint toe
4. **Verifieert** de constraint
5. **Test** de foreign key functionaliteit
6. **Zorgt** ervoor dat RLS policies correct zijn

## ✅ Verificatie

Na het uitvoeren van een script, controleer of:

1. **Foreign Key Constraint**: De `instructor_id` kolom verwijst naar `auth.users(id)`
2. **RLS Policies**: Er zijn policies voor instructeurs en studenten
3. **Indexes**: Er zijn performance indexes aanwezig

Je kunt dit controleren door de volgende query uit te voeren:

```sql
-- Controleer foreign key constraints
SELECT 
    tc.constraint_name,
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
AND tc.table_name = 'lessons'
AND tc.table_schema = 'public';
```

## 🧪 Test de Fix

Na het uitvoeren van het script:

1. **Ga terug naar de app**
2. **Probeer een les toe te voegen**
3. **Controleer of er geen foutmeldingen meer zijn**

## 🔍 Debug Tips

Als het probleem blijft bestaan:

### 1. Controleer User Authentication
```sql
-- Controleer of de huidige gebruiker bestaat in auth.users
SELECT 
    auth.uid() as current_user_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()) 
        THEN 'User exists' 
        ELSE 'User NOT found' 
    END as user_status;
```

### 2. Controleer RLS Policies
```sql
-- Controleer of RLS policies correct zijn ingesteld
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'lessons' 
AND schemaname = 'public';
```

### 3. Test Database Connectie
```sql
-- Test of je toegang hebt tot de lessons tabel
SELECT COUNT(*) FROM lessons LIMIT 1;
```

## 🚀 Alternatieve Oplossing

Als de scripts niet werken, kun je ook handmatig de foreign key constraint aanpassen:

```sql
-- Verwijder de problematische constraint
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_instructor_id_fkey;

-- Voeg de correcte constraint toe
ALTER TABLE public.lessons 
ADD CONSTRAINT lessons_instructor_id_fkey 
FOREIGN KEY (instructor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

## 📞 Support

Als het probleem blijft bestaan:

1. **Controleer** de Supabase logs in het dashboard
2. **Kijk** naar de browser console voor meer foutmeldingen
3. **Controleer** of alle andere database scripts zijn uitgevoerd
4. **Verifieer** dat je Supabase environment variables correct zijn ingesteld

## ✅ Succesvolle Fix

Na een succesvolle fix zou je het volgende moeten zien:

- ✅ Geen 409 Conflict errors meer
- ✅ Lessen kunnen worden toegevoegd, bewerkt en verwijderd
- ✅ Foreign key constraint verwijst naar `auth.users(id)`
- ✅ RLS policies zijn actief
- ✅ Performance indexes zijn aanwezig 