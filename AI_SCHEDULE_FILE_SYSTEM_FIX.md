# AI Schedule File System Fix

## 🚨 Probleem
De error "Failed to create editable input" treedt op omdat de API probeert bestanden te schrijven naar het bestandssysteem, wat problemen kan veroorzaken in serverless omgevingen.

## 🔧 Oplossing

### Stap 1: API Route Fix
De API route is aangepast om:
- ✅ Geen bestanden meer te schrijven naar het bestandssysteem
- ✅ Data direct door te geven via de response
- ✅ Betere error handling te hebben

### Stap 2: Frontend Fix
De frontend is aangepast om:
- ✅ Data direct door te geven via URL parameters
- ✅ localStorage te gebruiken voor data opslag
- ✅ Geen bestandspaden meer te gebruiken

### Stap 3: Run Generation Fix
De run-generation API is aangepast om:
- ✅ Data direct te accepteren in plaats van bestandspaden
- ✅ Tijdelijke bestanden te maken indien nodig
- ✅ Automatische cleanup van tijdelijke bestanden

## 🧪 Testen

### Test 1: Database Connectie
Ga naar `/api/ai-schedule/test-connection` om te controleren of:
- Database connectie werkt
- Bestandssysteem toegang werkt
- Alle componenten correct zijn geconfigureerd

### Test 2: AI Weekplanning Flow
1. Ga naar `/dashboard/lessons`
2. Klik op "AI Weekplanning"
3. Selecteer een week
4. Controleer of er geen error meer optreedt
5. Controleer of de test planning werkt

## 📋 Wat is er aangepast

### API Route (`/api/ai-schedule/create-editable-input`)
- ✅ Verwijderd: Bestand schrijven naar bestandssysteem
- ✅ Toegevoegd: Data direct teruggeven in response
- ✅ Verbeterd: Error handling

### Frontend (`/dashboard/lessons`)
- ✅ Aangepast: Altijd data parameter gebruiken
- ✅ Verwijderd: Bestandspad logica

### AI Schedule Page (`/dashboard/ai-schedule`)
- ✅ Aangepast: Altijd data uit localStorage gebruiken
- ✅ Verwijderd: Bestandspad logica
- ✅ Vereenvoudigd: Test planning handler

### Run Generation API (`/api/ai-schedule/run-generation`)
- ✅ Toegevoegd: Ondersteuning voor directe data input
- ✅ Toegevoegd: Tijdelijke bestand creatie
- ✅ Toegevoegd: Automatische cleanup

## 🔍 Troubleshooting

### Als de error blijft optreden:

1. **Controleer de test API:**
   ```
   GET /api/ai-schedule/test-connection
   ```

2. **Controleer browser console:**
   - Open Developer Tools
   - Kijk naar Network tab
   - Controleer of er errors zijn

3. **Controleer localStorage:**
   ```javascript
   // In browser console
   localStorage.getItem('aiScheduleData')
   ```

4. **Controleer URL parameters:**
   - De URL zou moeten bevatten: `?week=...&data=...`
   - De data parameter zou een lange JSON string moeten zijn

### Veelvoorkomende problemen:

1. **URL te lang:** Als de data parameter te lang is, kan dit problemen veroorzaken
2. **localStorage vol:** Als localStorage vol is, kan data niet worden opgeslagen
3. **JSON parsing error:** Als de data niet correct wordt geëncoded/gedecoded

## ✅ Verwachte resultaten

Na het uitvoeren van de fixes zou je moeten zien:
- ✅ Geen "Failed to create editable input" error meer
- ✅ AI Weekplanning werkt zonder bestandssysteem
- ✅ Data wordt correct doorgegeven via URL parameters
- ✅ Test planning werkt met localStorage data

## 🚀 Voordelen van deze oplossing

1. **Geen bestandssysteem afhankelijkheid:** Werkt in alle omgevingen
2. **Betere performance:** Geen I/O operaties
3. **Eenvoudiger debugging:** Data is direct zichtbaar in URL
4. **Automatische cleanup:** Geen achtergebleven bestanden 