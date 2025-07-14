# Weekoverzicht Functionaliteit - RijFlow App

## 🎯 Overzicht

De weekoverzicht pagina is uitgebreid met volledige functionaliteit voor het beheren van lessen. Instructeurs kunnen nu lessen toevoegen, bewerken, verwijderen en dupliceren, plus een dagoverzicht bekijken met Google Maps integratie.

## ✨ Nieuwe Functionaliteiten

### 📅 Weekoverzicht
- **Les toevoegen**: Klik op "Les toevoegen" knop of op een dag om een nieuwe les te plannen
- **Les bewerken**: Klik op het bewerk icoon (potlood) bij een les
- **Les verwijderen**: Klik op het prullenbak icoon bij een les
- **Les dupliceren**: Klik op het kopieer icoon bij een les
- **Dagoverzicht**: Klik op een dag om het dagoverzicht te openen

### 📱 Dagoverzicht
- **Tijd zonder datum**: Toont alleen de tijd van elke les
- **Leerling naam**: Toont de voornaam van de leerling
- **Google Maps knop**: Opent automatisch Google Maps met het adres van de leerling
- **Notities**: Toont eventuele notities bij de les

## 🛠 Technische Implementatie

### Database Schema
De lessen worden opgeslagen in de `lessons` tabel met de volgende structuur:
```sql
CREATE TABLE public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
  notes TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### RLS Policies
- **Instructeurs**: Kunnen hun eigen lessen beheren (CRUD operaties)
- **Leerlingen**: Kunnen alleen hun eigen lessen bekijken

### API Endpoints
De functionaliteit gebruikt Supabase client voor:
- `GET /lessons` - Ophalen van lessen voor de huidige week
- `POST /lessons` - Nieuwe les toevoegen
- `PUT /lessons/:id` - Les bewerken
- `DELETE /lessons/:id` - Les verwijderen

## 🚀 Setup Instructies

### 1. Database Setup
Voer het volgende SQL script uit in je Supabase SQL Editor:
```sql
-- Zie create-lessons-table.sql voor het volledige script
```

### 2. Dependencies
Zorg ervoor dat de volgende dependencies zijn geïnstalleerd:
```json
{
  "react-hot-toast": "^2.5.2",
  "@supabase/supabase-js": "^2.50.5"
}
```

### 3. Environment Variables
Controleer of je Supabase environment variables correct zijn ingesteld:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📋 Gebruik Instructies

### Voor Instructeurs

#### Les Toevoegen
1. Ga naar het weekoverzicht
2. Klik op "Les toevoegen" of klik op een specifieke dag
3. Vul de gegevens in:
   - **Datum**: Selecteer de datum
   - **Starttijd**: Kies starttijd
   - **Eindtijd**: Kies eindtijd
   - **Leerling**: Selecteer een leerling uit de lijst
   - **Notities**: Optionele notities
4. Klik op "Toevoegen"

#### Les Bewerken
1. Klik op het bewerk icoon (potlood) bij een les
2. Wijzig de gewenste gegevens
3. Klik op "Bijwerken"

#### Les Dupliceren
1. Klik op het kopieer icoon bij een les
2. De les wordt gekopieerd naar het formulier
3. Pas de datum/tijd aan indien gewenst
4. Klik op "Toevoegen"

#### Les Verwijderen
1. Klik op het prullenbak icoon bij een les
2. Bevestig de verwijdering

#### Dagoverzicht Bekijken
1. Klik op een dag in het weekoverzicht
2. Bekijk alle lessen voor die dag
3. Klik op "Google Maps" om het adres van een leerling te openen

### Google Maps Integratie
- Elke les in het dagoverzicht heeft een "Google Maps" knop
- De knop opent automatisch Google Maps met het adres van de leerling
- Het adres wordt opgehaald uit het leerlingprofiel

## 🔧 Troubleshooting

### Veelvoorkomende Problemen

#### 1. "Fout bij het laden van lessen"
- Controleer of de `lessons` tabel bestaat in Supabase
- Controleer of de RLS policies correct zijn ingesteld
- Controleer of de instructeur is ingelogd

#### 2. "Fout bij het opslaan van de les"
- Controleer of alle verplichte velden zijn ingevuld
- Controleer of de geselecteerde leerling bestaat
- Controleer of de datum en tijd geldig zijn

#### 3. Google Maps opent niet
- Controleer of de leerling een geldig adres heeft ingevuld
- Controleer of de browser pop-ups toestaat

#### 4. Toasts verschijnen niet
- Controleer of `react-hot-toast` is geïnstalleerd
- Controleer of de `Toaster` component is toegevoegd aan de layout

### Debug Tips
1. Open browser developer tools (F12)
2. Kijk naar de Console tab voor foutmeldingen
3. Controleer de Network tab voor API calls
4. Controleer de Supabase logs in het dashboard

## 📱 Responsive Design
De functionaliteit is volledig responsive en werkt op:
- Desktop computers
- Tablets
- Mobiele telefoons

## 🔒 Beveiliging
- Alle database operaties zijn beveiligd met Row Level Security (RLS)
- Instructeurs kunnen alleen hun eigen lessen beheren
- Leerlingen kunnen alleen hun eigen lessen bekijken
- Alle input wordt gevalideerd

## 🎨 UI/UX Features
- Moderne, schone interface
- Intuïtieve iconen en knoppen
- Hover effecten en transitions
- Loading states en error handling
- Toast notifications voor feedback
- Responsive design voor alle schermformaten

## 📈 Toekomstige Verbeteringen
- Drag & drop functionaliteit voor lessen
- Bulk operaties (meerdere lessen tegelijk bewerken)
- Automatische conflictdetectie
- Integratie met externe kalender apps
- Push notificaties voor lesherinneringen
- Offline functionaliteit 