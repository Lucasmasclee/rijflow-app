# Rijschoolnaam Fix - RijFlow App

## 🚨 Probleem
De rijschoolnaam in het dashboard wordt niet opgeslagen en verdwijnt na het verversen van de pagina.

## 🔍 Oorzaak
De rijschoolnaam wordt alleen lokaal in de state opgeslagen en wordt niet naar de database geschreven. Er ontbreekt een `rijschoolnaam` veld in de `instructors` tabel.

## 🛠 Oplossing

### Stap 1: Database Setup
Voer het volgende SQL script uit in je Supabase SQL Editor:

1. Ga naar je Supabase Dashboard
2. Ga naar SQL Editor
3. Kopieer en plak de inhoud van `create-instructors-table.sql`
4. Klik op "Run"

**Of voer dit SQL script direct uit:**

```sql
-- Create instructors table with rijschoolnaam field for RijFlow app
-- Run this in your Supabase SQL editor

-- ============================================================================
-- INSTRUCTORS TABLE
-- ============================================================================

-- Create instructors table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.instructors (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  rijschoolnaam TEXT DEFAULT 'Mijn Rijschool',
  location TEXT,
  kvk_number TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instructors_email ON instructors(email);

-- Enable Row Level Security
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Instructors can manage own data" ON instructors;

-- Policy: Instructors can only manage their own data
CREATE POLICY "Instructors can manage own data" ON instructors
  FOR ALL USING (auth.uid() = id);
```

### Stap 2: Code Wijzigingen
De volgende bestanden zijn al aangepast:

1. **`src/types/database.ts`** - Instructeur interface bijgewerkt met `rijschoolnaam` veld
2. **`src/app/dashboard/page.tsx`** - Functies toegevoegd om rijschoolnaam op te halen en op te slaan
3. **`src/contexts/AuthContext.tsx`** - Nieuwe instructeurs krijgen automatisch een default rijschoolnaam

### Stap 3: Testen
1. **Log uit** en **log weer in** als instructeur
2. **Ga naar het dashboard**
3. **Klik op het bewerk icoon** naast de rijschoolnaam
4. **Wijzig de naam** en klik op de groene vinkje
5. **Ververs de pagina** - de naam zou nu bewaard moeten blijven

## 🔧 Wat de Fix Doet

### Database Wijzigingen
- **Maakt** `instructors` tabel aan met `rijschoolnaam` veld
- **Stelt** default waarde in op 'Mijn Rijschool'
- **Schakelt** Row Level Security in
- **Maakt** RLS policies aan voor beveiliging

### Code Wijzigingen
- **Haalt** rijschoolnaam op uit database bij het laden van de pagina
- **Slaat** rijschoolnaam op in database bij het bewerken
- **Toont** success/error meldingen
- **Maakt** nieuwe instructeurs automatisch aan met default naam

## 🎯 Resultaat
Na het uitvoeren van deze fix:
- ✅ Rijschoolnaam wordt opgeslagen in de database
- ✅ Rijschoolnaam blijft bewaard na het verversen van de pagina
- ✅ Nieuwe instructeurs krijgen automatisch een default naam
- ✅ Beveiliging via Row Level Security
- ✅ Success/error feedback voor gebruikers

## 🚀 Deployment
Na het uitvoeren van het SQL script en het deployen van de code wijzigingen, zou de rijschoolnaam functionaliteit volledig moeten werken. 