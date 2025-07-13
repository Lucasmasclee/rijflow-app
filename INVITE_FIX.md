# Invite Token Probleem - Oplossing

## Probleem
Wanneer je een uitnodigingslink probeert te openen, krijg je de foutmelding "Ongeldige of verlopen uitnodiging".

## Mogelijke Oorzaken

### 1. Database Kolommen Ontbreken
De `students` tabel in Supabase heeft mogelijk niet de benodigde kolommen:
- `invite_token` (UUID)
- `user_id` (UUID, verwijst naar auth.users)

### 2. Database Setup
Voer het volgende SQL script uit in je Supabase SQL Editor:

```sql
-- Voeg ontbrekende kolommen toe
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS invite_token UUID;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Maak indexen voor snellere zoekopdrachten
CREATE INDEX IF NOT EXISTS idx_students_invite_token ON students(invite_token);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
```

### 3. Row Level Security (RLS)
Zorg ervoor dat RLS is ingeschakeld en de juiste policies zijn ingesteld:

```sql
-- Schakel RLS in
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies voor instructeurs
CREATE POLICY "Instructors can view their own students" ON students
    FOR SELECT USING (auth.uid() = instructor_id);

CREATE POLICY "Instructors can insert their own students" ON students
    FOR INSERT WITH CHECK (auth.uid() = instructor_id);

-- Policies voor studenten
CREATE POLICY "Students can view their own data" ON students
    FOR SELECT USING (auth.uid() = user_id);
```

## Debug Stappen

1. **Open de browser developer tools** (F12)
2. **Ga naar de Console tab**
3. **Open de uitnodigingslink opnieuw**
4. **Kijk naar de console output** voor debug informatie

De debug output zal tonen:
- Of de `invite_token` kolom bestaat
- Of de student wordt gevonden in de database
- Welke foutmeldingen er optreden

## Snelle Fix

Als je de database niet kunt aanpassen, kun je tijdelijk de invite functionaliteit uitschakelen door:

1. Ga naar `src/app/dashboard/students/new/page.tsx`
2. Commentaar de invite token generatie uit
3. Gebruik een eenvoudige redirect naar de students lijst

## Contact

Als het probleem aanhoudt, neem contact op met de ontwikkelaar met:
- De console output van de browser
- De foutmelding die je ziet
- De URL van de uitnodigingslink 