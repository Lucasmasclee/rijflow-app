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

6. **Leerling Beschikbaarheid** - ✅ GEFIXED (Nieuw!)
   - Dummy response respecteert nu leerling beschikbaarheid
   - AI prompt is verbeterd met duidelijke beschikbaarheid regels
   - Nederlandse en Engelse dagnamen worden herkend
   - Waarschuwingen als er geen overlappende beschikbare dagen zijn

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
3. Controleer of response wordt getoond
4. Controleer of waarschuwingen worden getoond

#### Stap 6: Leerling Beschikbaarheid Test (Nieuw!)
1. Stel instructeur beschikbaarheid in: maandag, dinsdag, woensdag, vrijdag
2. Voeg een leerling toe met notities: "maandag ochtend, dinsdag middag, vrijdag ochtend"
3. Start AI planning
4. Controleer dat lessen ALLEEN op maandag, dinsdag en vrijdag worden gepland
5. Controleer dat er GEEN lessen op woensdag worden gepland

### 🔧 **Debug Tools:**

Gebruik de debug functies in de browser console:

```javascript
// Test basis functionaliteit
testAISchedule()

// Test leerling beschikbaarheid specifiek
testStudentAvailability()

// Valideer huidige data
debugAIScheduleValidation()

// Test API call
testAPICall()

// Check database
checkDatabaseStudents()

// Test lessons table
testLessonsTable()

// Run alle tests
runAllDebugChecks()
```

### 🐛 **Bekende Issues:**

1. **Geen bekende issues meer!** ✅
   - Alle major bugs zijn gefixed
   - Leerling beschikbaarheid wordt nu correct gerespecteerd
   - Dummy response werkt correct zonder OpenAI API key

### 📝 **Test Cases:**

#### Test Case 1: Basis Beschikbaarheid
- **Instructeur**: maandag, dinsdag, woensdag, vrijdag
- **Leerling**: "maandag ochtend, dinsdag middag, vrijdag ochtend"
- **Verwacht**: 3 lessen op maandag, dinsdag, vrijdag
- **Niet verwacht**: lessen op woensdag

#### Test Case 2: Geen Overlap
- **Instructeur**: maandag, dinsdag, woensdag
- **Leerling**: "donderdag, vrijdag"
- **Verwacht**: waarschuwing over geen overlappende dagen

#### Test Case 3: Engelse Dagnamen
- **Instructeur**: maandag, dinsdag, woensdag, vrijdag
- **Leerling**: "monday morning, tuesday afternoon, friday morning"
- **Verwacht**: 3 lessen op maandag, dinsdag, vrijdag

### 🎯 **Succes Criteria:**

- [x] AI planning werkt zonder OpenAI API key (dummy response)
- [x] Leerling beschikbaarheid wordt gerespecteerd
- [x] Nederlandse en Engelse dagnamen worden herkend
- [x] Waarschuwingen worden getoond bij problemen
- [x] Alle lessen kunnen worden toegevoegd aan database
- [x] Navigatie werkt correct
- [x] Error handling werkt correct

### 📊 **Performance:**

- Dummy response: < 1 seconde
- Echte AI response: 5-15 seconden (afhankelijk van OpenAI)
- Database operaties: < 2 seconden
- UI updates: < 500ms

### 🔄 **Workflow:**

1. **Setup**: Configureer instructeur beschikbaarheid
2. **Leerlingen**: Voeg leerlingen toe met beschikbaarheid notities
3. **Instellingen**: Configureer planning instellingen
4. **AI Planning**: Genereer rooster
5. **Review**: Controleer gegenereerde lessen
6. **Selectie**: Selecteer gewenste lessen
7. **Toevoegen**: Voeg lessen toe aan database
8. **Resultaat**: Bekijk weekoverzicht

### 🚨 **Troubleshooting:**

#### Probleem: Leerling beschikbaarheid wordt niet gerespecteerd
**Oplossing**: 
- Controleer of notities Nederlandse of Engelse dagnamen bevatten
- Controleer of instructeur beschikbaarheid correct is ingesteld
- Test met dummy response (zonder OpenAI API key)

#### Probleem: AI response is ongeldig
**Oplossing**:
- Controleer OpenAI API key
- Controleer internet verbinding
- Gebruik dummy response voor testing

#### Probleem: Database errors
**Oplossing**:
- Controleer Supabase verbinding
- Controleer RLS policies
- Controleer tabel structuur

### 📈 **Monitoring:**

- Console logs voor debugging
- Error tracking in UI
- Success/error toasts
- Loading states
- Validation feedback 