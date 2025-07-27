# SMS Testing Guide - Availability Links

## 🎯 Overzicht

Deze guide helpt je bij het testen van de SMS flow voor beschikbaarheid links. Het systeem werkt als volgt:

1. **Instructeur** klikt op "SMS Leerlingen"
2. **Systeem** genereert week-specifieke links voor elke leerling
3. **SMS** wordt verstuurd met persoonlijke link
4. **Leerling** vult beschikbaarheid in via de link

## 📋 Voorbereiding

### 1. Database Setup

Voer eerst deze SQL scripts uit in je Supabase SQL Editor:

```sql
-- 1. Maak availability_links tabel aan
-- Voer create-week-specific-links.sql uit

-- 2. Zorg dat alle leerlingen links hebben voor komende 8 weken
-- Voer ensure-availability-links.sql uit

-- 3. Test de functionaliteit
-- Voer test-sms-availability-links.sql uit
```

### 2. Environment Variables

Zorg ervoor dat je deze Twilio variabelen hebt in je `.env.local`:

```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=your_twilio_phone_number
TWILIO_MESSAGING_SERVICE_SID=your_messaging_service_sid
TWILIO_SENDER_NAME=RijFlow
NEXT_PUBLIC_BASE_URL=https://rijflow.nl
```

## 🧪 Test Stappen

### Stap 1: Controleer Database

Voer dit uit in Supabase SQL Editor:

```sql
-- Controleer of alle leerlingen links hebben
SELECT 
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  COUNT(al.id) as links_count,
  CASE 
    WHEN COUNT(al.id) = 8 THEN '✓ COMPLEET'
    ELSE '⚠ ONVOLLEDIG (' || COUNT(al.id) || '/8)'
  END as status
FROM students s
LEFT JOIN availability_links al ON s.id = al.student_id
GROUP BY s.id, s.first_name, s.last_name
ORDER BY s.first_name, s.last_name;
```

### Stap 2: Test SMS Functionaliteit

1. **Ga naar het leerlingoverzicht**: `/dashboard/students`
2. **Klik op "SMS Leerlingen"** knop
3. **Selecteer een week** (bijvoorbeeld volgende week)
4. **Selecteer leerlingen** die je wilt testen
5. **Klik op "Verstuur SMS"**

### Stap 3: Verificatie

Na het versturen van SMS berichten:

```sql
-- Controleer of sms_laatst_gestuurd is bijgewerkt
SELECT 
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  s.sms_laatst_gestuurd,
  al.week_start,
  al.token,
  'https://rijflow.nl/beschikbaarheid/' || al.token as full_url
FROM students s
JOIN availability_links al ON s.id = al.student_id
WHERE s.sms_laatst_gestuurd IS NOT NULL
ORDER BY s.sms_laatst_gestuurd DESC;
```

## 🔍 Debug Queries

### Controleer Beschikbare Links

```sql
-- Toon alle beschikbare links voor komende weken
SELECT 
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  s.phone,
  al.week_start,
  al.token,
  'https://rijflow.nl/beschikbaarheid/' || al.token as full_url
FROM students s
JOIN availability_links al ON s.id = al.student_id
WHERE al.expires_at > NOW()
ORDER BY s.first_name, s.last_name, al.week_start;
```

### Test Specifieke Week

```sql
-- Test links voor volgende week
WITH next_week AS (
  SELECT (CURRENT_DATE + INTERVAL '1 week')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '1 week')::date)::int + 1 as week_start
)
SELECT 
  'Links voor volgende week (' || nw.week_start::text || ')' as week_info,
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  s.phone,
  al.token,
  'https://rijflow.nl/beschikbaarheid/' || al.token as sms_url
FROM students s
JOIN availability_links al ON s.id = al.student_id
CROSS JOIN next_week nw
WHERE al.week_start = nw.week_start
  AND al.expires_at > NOW()
ORDER BY s.first_name, s.last_name;
```

### Genereer Voorbeeld SMS Berichten

```sql
-- Genereer voorbeeld SMS berichten
WITH target_week AS (
  SELECT (CURRENT_DATE + INTERVAL '1 week')::date - EXTRACT(DOW FROM (CURRENT_DATE + INTERVAL '1 week')::date)::int + 1 as week_start
)
SELECT 
  'SMS Bericht voor: ' || s.first_name || ' ' || COALESCE(s.last_name, '') as recipient,
  s.phone as phone_number,
  'Hallo ' || s.first_name || ', vul hier je beschikbaarheid in voor de week van ' || 
  to_char(tw.week_start, 'DD-MM-YYYY') || ': https://rijflow.nl/beschikbaarheid/' || al.token as sms_message
FROM students s
JOIN availability_links al ON s.id = al.student_id
CROSS JOIN target_week tw
WHERE al.week_start = tw.week_start
  AND al.expires_at > NOW()
ORDER BY s.first_name, s.last_name;
```

## 🚨 Troubleshooting

### Probleem: Geen links gegenereerd

**Oplossing:**
```sql
-- Voer ensure-availability-links.sql uit
-- Dit script maakt ontbrekende links aan
```

### Probleem: SMS wordt niet verstuurd

**Controleer:**
1. Twilio credentials in `.env.local`
2. Telefoonnummers van leerlingen (moeten Nederlands formaat zijn)
3. Console logs voor foutmeldingen

### Probleem: Links werken niet

**Controleer:**
```sql
-- Controleer of links niet verlopen zijn
SELECT 
  COUNT(*) as expired_links
FROM availability_links
WHERE expires_at <= NOW();
```

## 📱 SMS Bericht Format

Het systeem verstuurt SMS berichten in dit formaat:

```
Beste [Naam], vul je beschikbaarheid in voor [Week] met deze link: https://rijflow.nl/beschikbaarheid/[TOKEN]
```

Voorbeeld:
```
Beste Jan Jansen, vul je beschikbaarheid in voor 15-01-2025 - 21-01-2025 met deze link: https://rijflow.nl/beschikbaarheid/avail_abc123...
```

## ✅ Succesvolle Test

Een succesvolle test betekent:

1. ✅ Alle leerlingen hebben links voor komende 8 weken
2. ✅ SMS berichten worden verstuurd zonder fouten
3. ✅ Leerlingen kunnen via de links beschikbaarheid invullen
4. ✅ Beschikbaarheid wordt opgeslagen in `student_availability` tabel
5. ✅ `sms_laatst_gestuurd` wordt bijgewerkt na succesvolle SMS

## 🔄 Automatische Link Generatie

Het systeem genereert automatisch nieuwe links wanneer:

- Een instructeur SMS verstuurt voor een week zonder bestaande link
- Links verlopen (na 2 weken)
- Nieuwe leerlingen worden toegevoegd

## 📊 Monitoring

Gebruik deze query om de SMS activiteit te monitoren:

```sql
-- SMS activiteit overzicht
SELECT 
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  s.sms_laatst_gestuurd,
  COUNT(al.id) as total_links,
  COUNT(CASE WHEN al.expires_at > NOW() THEN 1 END) as active_links
FROM students s
LEFT JOIN availability_links al ON s.id = al.student_id
GROUP BY s.id, s.first_name, s.last_name, s.sms_laatst_gestuurd
ORDER BY s.sms_laatst_gestuurd DESC NULLS LAST;
``` 