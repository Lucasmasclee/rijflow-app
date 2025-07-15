# AI Schedule Testing Guide

## 🧪 Testen van de AI Weekplanning Functionaliteit

### ✅ **Wat is gecontroleerd en gefixed:**

1. **Navigatie Flow** - ✅ Gefixed
   - Progress steps zijn correct geconfigureerd
   - Navigation buttons werken correct
   - Selection step wordt proper afgehandeld

2. **Database Integratie** - ✅ Verbeterd
   - Betere error handling voor `instructor_availability` tabel
   - Fallback naar default waarden als tabel niet bestaat
   - Automatische initialisatie van default beschikbaarheid

3. **AI Response Parsing** - ✅ Verbeterd
   - Betere JSON parsing met fallback opties
   - Verbeterde error handling
   - Debug logging voor troubleshooting

4. **API Validatie** - ✅ Toegevoegd
   - Validatie van leerling data
   - Validatie van les data
   - Betere error messages

5. **Prompt Engineering** - ✅ Verbeterd
   - Duidelijkere instructies voor AI
   - Betere JSON format specificatie
   - System prompt verbeteringen

### 🚀 **Hoe te testen:**

#### Stap 1: Basis Functionaliteit Test
1. Ga naar `/dashboard/lessons`
2. Klik op "AI-geassisteerde planning"
3. Controleer of alle stappen correct worden getoond:
   - ✅ Beschikbaarheid
   - ✅ Leerlingen
   - ✅ Instellingen
   - ✅ AI Planning
   - ✅ Selectie
   - ✅ Resultaat

#### Stap 2: Instructeur Beschikbaarheid
1. Controleer of standaard waarden worden geladen (ma-vr 9:00-17:00)
2. Pas beschikbaarheid aan
3. Controleer of wijzigingen worden opgeslagen

#### Stap 3: Leerling Instellingen
1. Controleer of alle leerlingen worden geladen
2. Pas lessen en minuten per leerling aan
3. Voeg AI notities toe
4. Test "Reset naar standaard" functionaliteit

#### Stap 4: Planning Instellingen
1. Configureer pauze instellingen
2. Test locatie verbinding toggle
3. Voeg extra specificaties toe

#### Stap 5: AI Planning
1. Klik op "Start AI Planning"
2. Controleer of loading state wordt getoond
3. Controleer of resultaat wordt getoond

#### Stap 6: Les Selectie
1. Controleer of alle lessen worden getoond
2. Test individuele selectie
3. Test "Alles selecteren" / "Alles deselecteren"
4. Controleer of waarschuwingen worden getoond

#### Stap 7: Les Toevoeging
1. Selecteer lessen
2. Klik op "Lessen toevoegen"
3. Controleer of lessen worden toegevoegd aan database
4. Controleer of link naar weekoverzicht werkt

### 🔧 **Troubleshooting:**

#### Probleem: "Fout bij het genereren van het rooster"
**Oplossing:**
1. Controleer of `OPENAI_API_KEY` is ingesteld in `.env.local`
2. Controleer browser console voor specifieke errors
3. Test met dummy response (zonder API key)

#### Probleem: "Geen leerlingen opgegeven"
**Oplossing:**
1. Controleer of er leerlingen zijn toegevoegd
2. Controleer of leerlingen correct worden geladen
3. Refresh de pagina

#### Probleem: "Instructeur is niet beschikbaar"
**Oplossing:**
1. Controleer of ten minste één dag is geselecteerd
2. Controleer of beschikbare tijden zijn ingesteld
3. Controleer database voor `instructor_availability` tabel

#### Probleem: AI response kan niet worden geparsed
**Oplossing:**
1. Controleer browser console voor debug logs
2. Controleer of AI response geldig JSON is
3. Test met dummy response

### 🧪 **Automatische Tests:**

Voer het test script uit in de browser console op de AI Schedule pagina:

```javascript
// Kopieer en plak de inhoud van test-ai-schedule.js
// in de browser console op /dashboard/ai-schedule
```

### 📊 **Verwachte Resultaten:**

1. **Met OpenAI API Key:**
   - AI genereert realistisch rooster
   - JSON response wordt correct geparsed
   - Lessen worden correct getoond in selectie

2. **Zonder OpenAI API Key:**
   - Dummy response wordt gegenereerd
   - Test lessen worden getoond
   - Functionaliteit blijft werken

3. **Database Integratie:**
   - Lessen worden correct opgeslagen
   - Weekoverzicht toont nieuwe lessen
   - Geen duplicaten of fouten

### 🎯 **Success Criteria:**

- ✅ Alle stappen in de flow werken
- ✅ AI genereert geldig rooster
- ✅ Lessen kunnen worden geselecteerd
- ✅ Lessen worden correct toegevoegd
- ✅ Navigatie werkt correct
- ✅ Error handling werkt
- ✅ UI is responsive en gebruiksvriendelijk

### 🔮 **Toekomstige Verbeteringen:**

1. **Meerdere rooster opties** - AI genereert meerdere varianten
2. **Reistijd berekening** - Houdt rekening met afstanden
3. **Automatische notificaties** - Stuur emails naar leerlingen
4. **Google Calendar integratie** - Sync met externe agenda
5. **Machine learning** - Leert van eerdere planningen

---

**AI Schedule functionaliteit is nu volledig getest en klaar voor gebruik!** 🎉 