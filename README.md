# RijFlow - Slimme cockpit voor moderne rijinstructeurs

Een alles-in-één webapp waarmee rijinstructeurs hun hele praktijk kunnen runnen. Van lesplanning tot facturatie, alles op één plek.

## 🚀 Features

### Voor Rijinstructeurs
- **Dashboard** - Overzicht van geplande lessen, open taken, weekplanning
- **Leerlingenbeheer** - Profielen, lespakket, voortgang, historie
- **Lesplanning** - Drag & drop planner met dag-/weekoverzicht
- **Facturatie** - Automatische facturen (per les, per pakket), PDF-export, betalingstatus
- **Leskaart** - Digitaal leskaartje (wat is behandeld, wie reed, opmerking etc.)
- **Urenregistratie** - Automatisch lesuren per maand/week

### Voor Leerlingen
- **Persoonlijk dashboard** - Overzicht van lessen en voortgang
- **Chat met instructeur** - Directe communicatie
- **Beschikbaarheid** - Aangeven wanneer je beschikbaar bent
- **Voortgang** - Bekijk je vorderingen

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (React 18)
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Hosting**: Vercel
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast

## 📦 Installatie

### 1. Clone het project
```bash
git clone <repository-url>
cd rijschool-app
```

### 2. Installeer dependencies
```bash
npm install
```

### 3. Configureer Supabase

Maak een `.env.local` bestand aan in de root van het project:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Supabase Setup:
1. Ga naar [supabase.com](https://supabase.com) en maak een nieuw project
2. Ga naar Settings > API
3. Kopieer de Project URL en anon public key
4. Plak deze in je `.env.local` bestand

### 4. Database Schema

Voer de volgende SQL uit in je Supabase SQL Editor:

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('instructor', 'student')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rijschool table
CREATE TABLE public.rijscholen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  kvk_number TEXT,
  logo_url TEXT,
  instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table
CREATE TABLE public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rijschool_id UUID REFERENCES public.rijscholen(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lessons table
CREATE TABLE public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
  notes TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progress notes table
CREATE TABLE public.progress_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  notes TEXT NOT NULL,
  topics_covered TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sender_role TEXT CHECK (sender_role IN ('instructor', 'student')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Availability table
CREATE TABLE public.availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rijscholen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own data
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Instructors can see their own rijschool
CREATE POLICY "Instructors can manage own rijschool" ON public.rijscholen
  FOR ALL USING (auth.uid() = instructor_id);

-- Instructors can see their students
CREATE POLICY "Instructors can manage own students" ON public.students
  FOR ALL USING (auth.uid() = instructor_id);

-- Students can see their own data
CREATE POLICY "Students can view own data" ON public.students
  FOR SELECT USING (auth.uid() = id);

-- Instructors can manage their lessons
CREATE POLICY "Instructors can manage own lessons" ON public.lessons
  FOR ALL USING (auth.uid() = instructor_id);

-- Students can see their own lessons
CREATE POLICY "Students can view own lessons" ON public.lessons
  FOR SELECT USING (auth.uid() = student_id);

-- Instructors can manage progress notes for their students
CREATE POLICY "Instructors can manage progress notes" ON public.progress_notes
  FOR ALL USING (auth.uid() = instructor_id);

-- Students can view their own progress notes
CREATE POLICY "Students can view own progress notes" ON public.progress_notes
  FOR SELECT USING (auth.uid() = student_id);

-- Chat messages between instructor and student
CREATE POLICY "Chat participants can view messages" ON public.chat_messages
  FOR SELECT USING (auth.uid() = instructor_id OR auth.uid() = student_id);

CREATE POLICY "Chat participants can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = instructor_id OR auth.uid() = student_id);

-- Students can manage their own availability
CREATE POLICY "Students can manage own availability" ON public.availability
  FOR ALL USING (auth.uid() = student_id);

-- Instructors can view their students' availability
CREATE POLICY "Instructors can view student availability" ON public.availability
  FOR SELECT USING (auth.uid() IN (
    SELECT instructor_id FROM public.students WHERE id = student_id
  ));
```

### 5. Start de development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

## 🚀 Deployment

### Vercel (Aanbevolen)

1. Push je code naar GitHub
2. Ga naar [vercel.com](https://vercel.com)
3. Import je repository
4. Voeg je environment variables toe
5. Deploy!

### Environment Variables voor Production

Zorg ervoor dat je de volgende environment variables instelt in je Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📱 Gebruik

### Voor Rijinstructeurs

1. **Registreer** je als rijinstructeur
2. **Maak een rijschoolprofiel** aan
3. **Voeg leerlingen toe** via het dashboard
4. **Plan lessen** in de kalender
5. **Houd voortgang bij** per leerling
6. **Genereer facturen** automatisch

### Voor Leerlingen

1. **Registreer** je als leerling
2. **Log in** om je dashboard te zien
3. **Vul je beschikbaarheid** in
4. **Chat** met je instructeur
5. **Bekijk je voortgang** en lessen

## 🎯 Roadmap

### Fase 1 (MVP) - ✅ Voltooid
- [x] Gebruikersregistratie en authenticatie
- [x] Dashboard voor instructeurs en leerlingen
- [x] Leerlingenbeheer
- [x] Lesplanning
- [x] Basis chat functionaliteit

### Fase 2 - 🚧 In ontwikkeling
- [ ] Digitale leskaart
- [ ] Voortgang bijhouden
- [ ] Facturatie module
- [ ] Urenregistratie
- [ ] Notificaties

### Fase 3 - 📋 Gepland
- [ ] Leerling-app (mobiele webapp)
- [ ] Analytics voor instructeurs
- [ ] Koppeling met theorieplatforms
- [ ] AI-lesanalyse

## 💰 Verdienmodel

- **Freemium**: 1 instructeur, beperkt aantal leerlingen gratis
- **Basic (€19/maand)**: Volledige planning, leerlingbeheer, rapportage
- **Pro (€39/maand)**: Inclusief facturatie, leerlingportal, 2+ instructeurs
- **Team (€99+/maand)**: Meerdere instructeurs + dashboards per vestiging

## 🤝 Bijdragen

1. Fork het project
2. Maak een feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit je wijzigingen (`git commit -m 'Add some AmazingFeature'`)
4. Push naar de branch (`git push origin feature/AmazingFeature`)
5. Open een Pull Request

## 📄 Licentie

Dit project is gelicenseerd onder de MIT License - zie het [LICENSE](LICENSE) bestand voor details.

## 📞 Support

Voor vragen of support, neem contact op via:
- Email: support@rijflow.nl
- Website: [rijflow.nl](https://rijflow.nl)

---

**RijFlow** - De slimme cockpit voor moderne rijinstructeurs 🚗✨
