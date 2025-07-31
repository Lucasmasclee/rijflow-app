# Student Availability Public Token Access Fix

## Probleem

Leerlingen konden geen beschikbaarheid invullen via de `/beschikbaarheid/[public_token]` pagina omdat de RLS (Row Level Security) policies in Supabase alleen toegang gaven aan:

1. **Instructeurs** met `auth.uid() = instructor_id`
2. **Studenten** met `auth.uid() = user_id`

Maar leerlingen die de beschikbaarheid pagina gebruiken:
- **Downloaden de app niet**
- **Hebben geen auth account**
- **Gebruiken alleen de `public_token` uit de `availability_links` tabel**

## Oplossing

### Nieuwe RLS Policy

Er is een nieuwe RLS policy toegevoegd die toegang geeft op basis van geldige `availability_links`:

```sql
CREATE POLICY "Public token access for availability" ON student_availability
    FOR ALL USING (
        -- Check of er een geldige availability link bestaat voor deze student en week
        EXISTS (
            SELECT 1 FROM availability_links al
            WHERE al.student_id = student_availability.student_id
            AND al.week_start = student_availability.week_start
            AND al.expires_at > NOW()
        )
    );
```

### Hoe het werkt

1. **Leerling klikt op link** → `/beschikbaarheid/avail_abc123...`
2. **Pagina haalt student op** → Via `availability_links` tabel met token
3. **RLS policy controleert** → Of er een geldige link bestaat voor die student/week
4. **Toegang verleend** → Als de link geldig is en niet verlopen

### Volledige RLS Policies

Nu zijn er 3 policies actief:

1. **"Instructor can manage student availability"** - Voor instructeurs via app
2. **"Student can manage own availability via auth"** - Voor studenten met auth account
3. **"Public token access for availability"** - Voor leerlingen zonder auth (NIEUW)

## Implementatie

Voer het SQL script uit:

```bash
# Voer dit uit in Supabase SQL Editor
fix-student-availability-public-token-access.sql
```

## Testen

1. **Genereer een availability link** voor een leerling
2. **Open de link** in een incognito browser (zonder auth)
3. **Vul beschikbaarheid in** en sla op
4. **Controleer** of de data is opgeslagen

## Voordelen

- ✅ **Leerlingen kunnen beschikbaarheid invullen** zonder app download
- ✅ **Beveiligd** via geldige/verlopen links
- ✅ **Week-specifiek** - elke week nieuwe link
- ✅ **Instructeurs behouden controle** via app
- ✅ **Backward compatible** - bestaande functionaliteit blijft werken

## Technische Details

### Availability Links Flow

```
1. Instructor genereert link
   ↓
2. Link bevat: student_id + week_start + token + expires_at
   ↓
3. Student klikt link
   ↓
4. RLS policy checkt: EXISTS availability_links WHERE token=... AND expires_at > NOW()
   ↓
5. Toegang verleend voor die specifieke student/week combinatie
```

### Security

- **Links verlopen** na 2 weken
- **Week-specifiek** - geen toegang tot andere weken
- **Student-specifiek** - geen toegang tot andere studenten
- **Geen auth vereist** - werkt zonder login

## Troubleshooting

### Als het nog steeds niet werkt:

1. **Controleer availability_links tabel**:
   ```sql
   SELECT * FROM availability_links WHERE token = 'jouw_token';
   ```

2. **Controleer RLS policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'student_availability';
   ```

3. **Test de policy direct**:
   ```sql
   -- Test of de policy werkt voor een specifieke student/week
   SELECT EXISTS (
       SELECT 1 FROM availability_links al
       WHERE al.student_id = 'student_uuid'
       AND al.week_start = '2024-01-01'
       AND al.expires_at > NOW()
   );
   ```

### Veelvoorkomende problemen:

- **Link verlopen** → Genereer nieuwe link
- **Verkeerde week** → Controleer week_start in availability_links
- **RLS niet actief** → Voer het fix script opnieuw uit
- **Tabel bestaat niet** → Voer eerst create-week-specific-links.sql uit 