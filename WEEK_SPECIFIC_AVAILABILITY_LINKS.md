# Week-Specifieke Beschikbaarheid Links Systeem

## 🎯 Overzicht

Het systeem is aangepast om week-specifieke beschikbaarheid links te gebruiken in plaats van statische links per leerling. Dit zorgt ervoor dat:

1. **Elke SMS link is specifiek voor een bepaalde week**
2. **Leerlingen kunnen alleen beschikbaarheid invullen voor de week waarvoor de link is bedoeld**
3. **Links verlopen automatisch na 2 weken**
4. **Geen verwarring meer over voor welke week beschikbaarheid moet worden ingevuld**

## 🔄 Belangrijkste Wijzigingen

### 1. Nieuwe Database Tabel: `availability_links`

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

### 2. Helper Functies

#### `generate_availability_token()`
Genereert een unieke token voor elke link.

#### `create_availability_link(student_id, week_start)`
Maakt een nieuwe week-specifieke link aan of update een bestaande.

### 3. Aangepaste SMS API

De SMS API genereert nu automatisch week-specifieke links wanneer een instructeur SMS berichten verstuurt.

### 4. Aangepaste Beschikbaarheid Pagina

De beschikbaarheid pagina valideert nu de link en toont de specifieke week waarvoor beschikbaarheid moet worden ingevuld.

## 🚀 Implementatie Stappen

### Stap 1: Database Setup

Voer het SQL script uit in je Supabase SQL Editor:

```sql
-- Voer create-week-specific-links.sql uit
```

### Stap 2: Environment Variables

Voeg de volgende variabele toe aan je `.env.local`:

```env
NEXT_PUBLIC_BASE_URL=https://rijflow.nl
```

### Stap 3: Code Deployment

De volgende bestanden zijn aangepast:

#### Nieuwe Bestanden:
- `create-week-specific-links.sql` - Database setup script

#### Aangepaste Bestanden:
- `src/app/api/sms/send/route.ts` - Genereert week-specifieke links
- `src/app/beschikbaarheid/[public_token]/page.tsx` - Valideert week-specifieke links
- `src/types/database.ts` - Nieuwe TypeScript interfaces

## 🔧 Hoe Het Werkt

### Instructeur Flow

1. **Week Selectie**: Instructeur selecteert een week in het leerlingoverzicht
2. **Leerling Selectie**: Selecteert leerlingen voor wie SMS moet worden verstuurd
3. **SMS Verzenden**: Systeem genereert automatisch week-specifieke links
4. **Link Generatie**: Voor elke leerling wordt een unieke link gemaakt voor die specifieke week

### Leerling Flow

1. **SMS Ontvangen**: Leerling krijgt SMS met week-specifieke link
2. **Link Klikken**: Link leidt naar beschikbaarheid pagina voor die specifieke week
3. **Week Weergave**: Pagina toont duidelijk voor welke week beschikbaarheid moet worden ingevuld
4. **Beschikbaarheid Invullen**: Leerling vult beschikbaarheid in voor die specifieke week
5. **Opslaan**: Data wordt opgeslagen met de juiste week_start datum

### Link Validatie

- **Token Validatie**: Elke link heeft een unieke token
- **Expiratie Check**: Links verlopen na 2 weken
- **Week Specificiteit**: Link is alleen geldig voor de specifieke week
- **Student Validatie**: Link is gekoppeld aan specifieke leerling

## 📱 Voorbeeld SMS Bericht

```
Beste Jan Jansen, vul je beschikbaarheid in voor 17 juli - 23 juli met deze link: https://rijflow.nl/beschikbaarheid/avail_abc123def456
```

## 🗄️ Database Schema

### availability_links
```sql
- id: UUID (Primary Key)
- student_id: UUID (Foreign Key naar students)
- week_start: DATE (maandag van de week)
- token: TEXT (unieke token)
- created_at: TIMESTAMP
- expires_at: TIMESTAMP (2 weken na aanmaak)
```

### student_availability (bestaand)
```sql
- id: UUID (Primary Key)
- student_id: UUID (Foreign Key naar students)
- week_start: DATE (maandag van de week)
- availability_data: JSONB (beschikbaarheid per dag)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
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

### Test 1: Database Setup

```sql
-- Controleer of de tabel bestaat
SELECT COUNT(*) FROM availability_links;

-- Test de helper functie
SELECT create_availability_link('student-uuid', '2024-01-15');
```

### Test 2: SMS Verzenden

1. Ga naar leerlingoverzicht
2. Klik op "SMS Leerlingen"
3. Selecteer een week en leerling
4. Verstuur SMS
5. Controleer of de link week-specifiek is

### Test 3: Beschikbaarheid Invullen

1. Open de week-specifieke link
2. Controleer of de juiste week wordt getoond
3. Vul beschikbaarheid in
4. Controleer of data wordt opgeslagen met juiste week_start

## 🐛 Troubleshooting

### Probleem: "Ongeldige of verlopen link"

**Oplossingen:**
- Controleer of de link niet verlopen is (2 weken)
- Verificeer of de token correct is
- Controleer of de link voor de juiste leerling is

### Probleem: Link werkt niet

**Oplossingen:**
- Controleer of de database tabel correct is aangemaakt
- Verificeer of de RLS policies correct zijn ingesteld
- Controleer de browser console voor errors

### Probleem: Verkeerde week wordt getoond

**Oplossingen:**
- Controleer of de week_start correct is opgeslagen in de link
- Verificeer of de datum conversie correct werkt
- Controleer de timezone instellingen

## 📈 Voordelen

### Voor Instructeurs
- **Duidelijkheid**: Elke link is specifiek voor een week
- **Controle**: Geen verwarring over welke week bedoeld is
- **Efficiëntie**: Automatische link generatie

### Voor Leerlingen
- **Duidelijkheid**: Zien direct voor welke week ze beschikbaarheid invullen
- **Eenvoud**: Geen verwarring over datums
- **Betrouwbaarheid**: Links verlopen automatisch

### Voor Het Systeem
- **Data Integriteit**: Beschikbaarheid is altijd gekoppeld aan juiste week
- **Beveiliging**: Verlopen links zijn automatisch ongeldig
- **Performance**: Geen onnodige queries voor verkeerde weken

## 🔄 Migratie van Oud Systeem

### Stap 1: Backup
Maak een backup van bestaande data voordat je de wijzigingen doorvoert.

### Stap 2: Database Update
Voer het SQL script uit om de nieuwe tabel aan te maken.

### Stap 3: Code Update
Deploy de nieuwe code met de aangepaste functionaliteit.

### Stap 4: Testen
Test de nieuwe functionaliteit grondig voordat je het in productie gebruikt.

## 📞 Support

Voor vragen of problemen:
1. Controleer de database logs in Supabase dashboard
2. Verificeer of alle SQL scripts correct zijn uitgevoerd
3. Test met een eenvoudige setup
4. Controleer de browser console voor JavaScript errors 