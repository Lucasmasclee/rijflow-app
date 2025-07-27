# Availability Links Setup & Gebruik

## 🎯 Overzicht

Het SMS leerlingen systeem gebruikt week-specifieke beschikbaarheid links. Elke link is uniek voor een specifieke leerling en een specifieke week. Dit zorgt ervoor dat leerlingen alleen beschikbaarheid kunnen invullen voor de week waarvoor de link is bedoeld.

## 🔧 Database Setup

### Stap 1: Controleer of de tabel bestaat

Voer eerst dit script uit om te controleren of de `availability_links` tabel bestaat:

```sql
-- Controleer of de tabel bestaat
SELECT COUNT(*) FROM availability_links;
```

Als de tabel niet bestaat of leeg is, ga naar Stap 2.

### Stap 2: Maak de tabel aan (indien nodig)

Voer `create-week-specific-links.sql` uit in je Supabase SQL Editor:

```sql
-- Voer het volledige script uit
-- Dit maakt de tabel aan met alle benodigde functies
```

### Stap 3: Genereer links voor alle leerlingen

Voer `generate-availability-links.sql` uit om links te maken voor alle leerlingen:

```sql
-- Dit genereert links voor alle leerlingen voor de komende 8 weken
-- Voer dit uit in je Supabase SQL Editor
```

Of gebruik het snelle script `quick-generate-links.sql`:

```sql
-- Eenvoudigere versie zonder uitgebreide output
```

## 📱 Hoe het werkt

### Voor Instructeurs

1. **Ga naar leerlingoverzicht** (`/dashboard/students`)
2. **Klik op "SMS Leerlingen"**
3. **Selecteer een week** (8 weken in de toekomst beschikbaar)
4. **Selecteer leerlingen** met geldige telefoonnummers
5. **Klik op "SMS Sturen"**

Het systeem:
- Genereert automatisch week-specifieke links voor elke leerling
- Verstuurt gepersonaliseerde SMS berichten
- Slaat de verzenddatum op voor cooldown tracking

### Voor Leerlingen

1. **Ontvang SMS** met persoonlijke link
2. **Klik op de link** (bijv. `https://rijflow.nl/beschikbaarheid/avail_abc123`)
3. **Vul beschikbaarheid in** voor de specifieke week
4. **Klik op "Opslaan"**

## 🔗 Link Structuur

### Database Schema

```sql
CREATE TABLE availability_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL, -- maandag van de week
  token TEXT UNIQUE NOT NULL, -- unieke token voor de link
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- link verloopt na 2 weken
  
  -- Zorg ervoor dat er maar één link per student per week is
  UNIQUE(student_id, week_start)
);
```

### URL Format

```
https://rijflow.nl/beschikbaarheid/[token]
```

Voorbeeld:
```
https://rijflow.nl/beschikbaarheid/avail_abc123def456
```

## 🔐 Beveiliging

### RLS Policies

- **Instructor Access**: Instructeurs kunnen links beheren voor hun leerlingen
- **Public Access**: Publiek kan geldige, niet-verlopen links gebruiken
- **Token Validation**: Elke request valideert de token en expiratie

### Link Expiratie

- **Automatische Expiratie**: Links verlopen na 2 weken
- **Database Cleanup**: Verlopen links worden automatisch ongeldig
- **Security**: Verlopen links kunnen niet meer worden gebruikt

## 🧪 Testen

### Test 1: Database Check

```sql
-- Controleer of er links zijn aangemaakt
SELECT 
  COUNT(*) as total_links,
  COUNT(DISTINCT student_id) as unique_students,
  COUNT(DISTINCT week_start) as unique_weeks
FROM availability_links;
```

### Test 2: SMS Verzenden

1. Ga naar `/dashboard/students`
2. Klik op "SMS Leerlingen"
3. Selecteer een week en leerling
4. Verstuur SMS
5. Controleer of de link week-specifiek is

### Test 3: Beschikbaarheid Invullen

1. Open een week-specifieke link
2. Controleer of de juiste week wordt getoond
3. Vul beschikbaarheid in
4. Controleer of data wordt opgeslagen

## 🔄 Automatische Link Generatie

### Wanneer worden links aangemaakt?

1. **Bulk generatie**: Via SQL scripts voor alle leerlingen
2. **SMS verzending**: Automatisch wanneer instructeur SMS verstuurt
3. **On-demand**: Via API calls indien nodig

### Helper Functies

```sql
-- Genereer een unieke token
SELECT generate_availability_token();

-- Maak een week-specifieke link
SELECT create_availability_link('student-uuid', '2024-01-15');
```

## 📊 Monitoring

### Belangrijke queries

```sql
-- Toon alle links per leerling
SELECT 
  s.first_name || ' ' || s.last_name as student_name,
  COUNT(al.id) as links_count,
  MIN(al.week_start) as earliest_week,
  MAX(al.week_start) as latest_week
FROM students s
LEFT JOIN availability_links al ON s.id = al.student_id
GROUP BY s.id, s.first_name, s.last_name
ORDER BY s.first_name, s.last_name;

-- Controleer verlopen links
SELECT COUNT(*) as expired_links
FROM availability_links
WHERE expires_at <= NOW();

-- Toon links die binnenkort verlopen
SELECT 
  s.first_name || ' ' || s.last_name as student_name,
  al.week_start,
  al.expires_at,
  al.expires_at - NOW() as time_until_expiry
FROM availability_links al
JOIN students s ON al.student_id = s.id
WHERE al.expires_at <= NOW() + INTERVAL '7 days'
ORDER BY al.expires_at;
```

## 🐛 Troubleshooting

### Probleem: "Ongeldige of verlopen link"

**Oplossingen:**
- Controleer of de link niet verlopen is (2 weken)
- Verificeer of de token correct is
- Controleer of de link voor de juiste leerling is

### Probleem: Geen links beschikbaar

**Oplossingen:**
- Voer `generate-availability-links.sql` uit
- Controleer of er leerlingen in de database staan
- Verificeer of de `create_availability_link` functie bestaat

### Probleem: SMS verzending faalt

**Oplossingen:**
- Controleer Twilio configuratie
- Verificeer telefoonnummers van leerlingen
- Controleer of er voldoende Twilio credits zijn

## 📞 Support

Voor vragen of problemen:
1. Controleer de logs in Supabase dashboard
2. Verificeer environment variables
3. Test met een eenvoudige leerling setup
4. Controleer Twilio account status en credits 