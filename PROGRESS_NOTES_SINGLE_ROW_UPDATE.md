# Progress Notes Single Row Update

## 🎯 Overzicht

De progress notes functionaliteit is volledig aangepast om één rij per leerling te gebruiken in plaats van meerdere rijen per notitie. Dit maakt het systeem eenvoudiger en efficiënter.

## 🔄 Database Wijzigingen

### Oude Structuur
```sql
CREATE TABLE public.progress_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  notes TEXT NOT NULL,
  topics_covered TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Nieuwe Structuur
```sql
CREATE TABLE public.progress_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE UNIQUE,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Belangrijkste Wijzigingen
- **UNIQUE constraint** op `student_id` - één rij per leerling
- **Verwijderd**: `lesson_id`, `date`, `topics_covered` kolommen
- **Behouden**: `notes` kolom bevat nu de hele geschiedenis
- **Automatische `updated_at`** timestamp via trigger

## 📁 Bestanden Aangepast

### 1. Database Script
- **`update-progress-notes-single-row.sql`** - Nieuw script om database te migreren

### 2. TypeScript Types
- **`src/types/database.ts`**
  - `ProgressNote` interface aangepast
  - `StudentWithProgressNotes` interface aangepast

### 3. Frontend Components
- **`src/app/dashboard/students/[id]/page.tsx`**
  - Progress notes functionaliteit volledig herschreven
  - Single text field voor hele geschiedenis
  - Automatische creatie van progress note record
  - Update functionaliteit in plaats van insert

- **`src/app/dashboard/page.tsx`**
  - `fetchProgressNotes` functie aangepast
  - `ExpandedLessonProgressNotes` component herschreven
  - Single row per student logica

## 🚀 Implementatie Stappen

### 1. Database Migratie
Voer het SQL script uit in Supabase:
```sql
-- Run update-progress-notes-single-row.sql in Supabase SQL editor
```

### 2. Frontend Updates
Alle frontend wijzigingen zijn al geïmplementeerd in de genoemde bestanden.

## ✨ Nieuwe Functionaliteit

### Student Detail Page
- **Eén tekstveld** voor alle progress notes
- **Automatische creatie** van progress note record als deze niet bestaat
- **Update in plaats van insert** - hele geschiedenis wordt bewerkt
- **Laatst bijgewerkt** timestamp wordt getoond

### Dashboard Page
- **Expanded lesson view** toont progress notes in één tekstveld
- **Automatische creatie** van progress note record indien nodig
- **Real-time updates** met toast notifications

## 🔧 Technische Details

### RLS Policies
De bestaande RLS policies blijven werken:
- Instructeurs kunnen hun eigen progress notes beheren
- Leerlingen kunnen hun eigen progress notes bekijken

### Performance
- **Minder database queries** - één rij per student
- **Eenvoudigere queries** - geen complexe joins nodig
- **Betere schaalbaarheid** - minder rijen in database

### Data Migratie
**BELANGRIJK**: Het SQL script verwijdert de oude tabel en maakt een nieuwe. 
Alle bestaande progress notes data gaat verloren bij deze migratie.

## 🎯 Voordelen

1. **Eenvoudiger beheer** - één tekstveld voor alle notities
2. **Betere performance** - minder database rijen
3. **Consistentie** - altijd één record per student
4. **Flexibiliteit** - vrije tekst zonder datum beperkingen
5. **Onderhoud** - minder complexe code

## ⚠️ Belangrijke Notities

- **Data verlies**: Bestaande progress notes gaan verloren bij migratie
- **Backup**: Maak backup van bestaande data voor migratie
- **Testing**: Test de nieuwe functionaliteit grondig
- **User training**: Gebruikers moeten wennen aan nieuwe interface

## 🔄 Rollback Plan

Als rollback nodig is:
1. Herstel database backup
2. Revert frontend code changes
3. Herstel oude progress_notes tabel structuur 