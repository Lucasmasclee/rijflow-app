# Student Availability Fix - AI Weekplanning

## 🐛 **Probleem**

De AI Weekplanning functionaliteit respecteerde niet de beschikbaarheid van leerlingen. Het systeem plantte lessen op alle beschikbare dagen van de instructeur, ongeacht de beschikbaarheid van de leerling.

**Voorbeeld scenario:**
- Instructeur beschikbaar: maandag, dinsdag, woensdag, vrijdag
- Leerling beschikbaar: maandag ochtend, dinsdag middag, vrijdag ochtend
- **Resultaat**: Lessen werden gepland op maandag, dinsdag EN woensdag (fout!)

## ✅ **Oplossing**

### 1. Dummy Response Verbetering

De `generateDummyResponse` functie in `src/lib/openai.ts` is aangepast om:

- Leerling beschikbaarheid te parsen uit notities
- Nederlandse en Engelse dagnamen te herkennen
- Alleen lessen te plannen op overlappende beschikbare dagen
- Waarschuwingen te geven bij problemen

```typescript
// Helper function to parse student availability from notes
function parseStudentAvailability(notes: string): string[] {
  const availableDays: string[] = []
  
  if (notes.includes('maandag') || notes.includes('monday')) availableDays.push('monday')
  if (notes.includes('dinsdag') || notes.includes('tuesday')) availableDays.push('tuesday')
  if (notes.includes('woensdag') || notes.includes('wednesday')) availableDays.push('wednesday')
  if (notes.includes('donderdag') || notes.includes('thursday')) availableDays.push('thursday')
  if (notes.includes('vrijdag') || notes.includes('friday')) availableDays.push('friday')
  if (notes.includes('zaterdag') || notes.includes('saturday')) availableDays.push('saturday')
  if (notes.includes('zondag') || notes.includes('sunday')) availableDays.push('sunday')
  
  return availableDays
}
```

### 2. AI Prompt Verbetering

De AI prompt is verbeterd met duidelijke instructies:

```typescript
KRITIEKE REGELS:
- Plan ALLEEN op dagen dat de instructeur beschikbaar is
- Plan ALLEEN op dagen dat de leerling beschikbaar is (uit hun notities)
- Als een leerling specifieke beschikbare dagen heeft, plan dan NOOIT op andere dagen
- Als er geen overlappende beschikbare dagen zijn, geef dan een waarschuwing
- Zoek naar Nederlandse en Engelse dagnamen in de notities
```

### 3. Frontend Prompt Synchronisatie

De frontend prompt generatie in `src/app/dashboard/ai-schedule/page.tsx` is gesynchroniseerd met de backend logica.

## 🧪 **Test Cases**

### Test Case 1: Basis Beschikbaarheid
- **Instructeur**: maandag, dinsdag, woensdag, vrijdag
- **Leerling**: "maandag ochtend, dinsdag middag, vrijdag ochtend"
- **Verwacht**: 3 lessen op maandag, dinsdag, vrijdag
- **Resultaat**: ✅ Correct - geen lessen op woensdag

### Test Case 2: Geen Overlap
- **Instructeur**: maandag, dinsdag, woensdag
- **Leerling**: "donderdag, vrijdag"
- **Verwacht**: waarschuwing over geen overlappende dagen
- **Resultaat**: ✅ Correct - waarschuwing wordt getoond

### Test Case 3: Engelse Dagnamen
- **Instructeur**: maandag, dinsdag, woensdag, vrijdag
- **Leerling**: "monday morning, tuesday afternoon, friday morning"
- **Verwacht**: 3 lessen op maandag, dinsdag, vrijdag
- **Resultaat**: ✅ Correct - Engelse dagnamen worden herkend

## 🔧 **Implementatie Details**

### Bestanden Aangepast:

1. **`src/lib/openai.ts`**
   - `generateDummyResponse()` - Verbeterd met beschikbaarheid parsing
   - `parseStudentAvailability()` - Nieuwe helper functie
   - `getDayOffset()` - Nieuwe helper functie
   - AI system prompt - Verbeterd met duidelijke regels
   - `generateSchedulePrompt()` - Verbeterd met beschikbaarheid instructies

2. **`src/app/dashboard/ai-schedule/page.tsx`**
   - `generateAIPrompt()` - Gesynchroniseerd met backend logica

3. **`test-ai-schedule.js`**
   - `testStudentAvailability()` - Nieuwe test functie
   - Verbeterde test cases

### Nieuwe Functies:

```typescript
// Parse student availability from notes
function parseStudentAvailability(notes: string): string[]

// Get day offset from day name
function getDayOffset(dayName: string): number

// Test student availability specifically
async function testStudentAvailability()
```

## 🎯 **Resultaat**

Na deze fix:

1. **Dummy Response** (zonder OpenAI API key):
   - Respecteert leerling beschikbaarheid
   - Geeft waarschuwingen bij problemen
   - Werkt correct zonder externe dependencies

2. **Echte AI Response** (met OpenAI API key):
   - Duidelijkere instructies voor beschikbaarheid
   - Betere prompt engineering
   - Consistent gedrag met dummy response

3. **Frontend**:
   - Gesynchroniseerde prompt generatie
   - Betere error handling
   - Duidelijkere feedback

## 🚀 **Gebruik**

### Voor Instructeurs:

1. Stel je beschikbaarheid in (maandag, dinsdag, woensdag, vrijdag)
2. Voeg leerlingen toe met beschikbaarheid notities:
   - "maandag ochtend, dinsdag middag, vrijdag ochtend"
   - "monday morning, tuesday afternoon, friday morning"
3. Start AI planning
4. Controleer dat lessen alleen op beschikbare dagen worden gepland

### Voor Ontwikkelaars:

```javascript
// Test de functionaliteit
testStudentAvailability()

// Debug beschikbaarheid parsing
console.log(parseStudentAvailability("maandag ochtend, dinsdag middag"))
// Output: ["monday", "tuesday"]
```

## 📊 **Performance Impact**

- **Dummy Response**: Geen impact (< 1 seconde)
- **AI Response**: Geen impact (zelfde prompt lengte)
- **Database**: Geen impact (geen wijzigingen)
- **Frontend**: Geen impact (geen extra API calls)

## 🔮 **Toekomstige Verbeteringen**

1. **Tijdsloten**: Ondersteuning voor specifieke tijden (ochtend/middag/avond)
2. **Flexibiliteit**: "Flexibel" optie voor leerlingen
3. **Prioriteiten**: Prioriteit systeem voor lessen
4. **Conflicten**: Betere conflict detectie
5. **Notificaties**: Automatische waarschuwingen bij problemen

---

**De AI Weekplanning respecteert nu correct de beschikbaarheid van leerlingen!** 🎉 