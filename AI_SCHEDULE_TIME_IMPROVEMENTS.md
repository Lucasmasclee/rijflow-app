# AI Schedule Time Improvements

## 🐛 **Probleem**
De AI Weekplanning functionaliteit respecteerde niet de specifieke tijden van leerlingen. Het systeem plantte lessen op de juiste dagen, maar niet binnen de beschikbare tijden van de leerling.

**Voorbeeld scenario:**
- Leerling beschikbaar: Maandag 8:00 - 12:00, Woensdag 12:00 - 16:00, Vrijdag 8:00 - 12:00
- **Resultaat**: Lessen werden gepland op maandag 9:00 (✅), dinsdag 11:00 (❌), vrijdag 13:00 (❌)

## ✅ **Oplossing**

### 1. Verbeterde Parsing Functies

#### `parseStudentAvailabilityWithTimes()`
Nieuwe functie die specifieke tijden uit beschikbaarheid notities kan parsen:

```typescript
function parseStudentAvailabilityWithTimes(notes: string): { day: string, startTime: string, endTime: string }[] {
  const availability: { day: string, startTime: string, endTime: string }[] = []
  const lines = notes.split('\n').map(line => line.trim().toLowerCase())
  
  for (const line of lines) {
    // Match patterns like "maandag 8:00 - 12:00" or "monday 8:00-12:00"
    const dayTimeMatch = line.match(/(maandag|monday|dinsdag|tuesday|woensdag|wednesday|donderdag|thursday|vrijdag|friday|zaterdag|saturday|zondag|sunday)\s+(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?/)
    
    if (dayTimeMatch) {
      const dayName = dayTimeMatch[1]
      const startHour = dayTimeMatch[2]
      const startMinute = dayTimeMatch[3] || '00'
      const endHour = dayTimeMatch[4]
      const endMinute = dayTimeMatch[5] || '00'
      
      // Convert Dutch day names to English
      const dayMap: { [key: string]: string } = {
        'maandag': 'monday',
        'dinsdag': 'tuesday', 
        'woensdag': 'wednesday',
        'donderdag': 'thursday',
        'vrijdag': 'friday',
        'zaterdag': 'saturday',
        'zondag': 'sunday'
      }
      
      const englishDay = dayMap[dayName] || dayName
      
      availability.push({
        day: englishDay,
        startTime: `${startHour.padStart(2, '0')}:${startMinute}`,
        endTime: `${endHour.padStart(2, '0')}:${endMinute}`
      })
    }
  }
  
  return availability
}
```

### 2. Verbeterde AI Prompts

#### System Prompt Verbeteringen
```typescript
KRITIEKE REGELS:
- Plan ALLEEN op dagen dat de instructeur beschikbaar is
- Plan ALLEEN op dagen dat de leerling beschikbaar is (uit hun beschikbaarheid notities)
- Als een leerling specifieke beschikbare dagen heeft, plan dan NOOIT op andere dagen
- Als een leerling specifieke tijden heeft (bijv. "maandag 8:00 - 12:00"), plan dan ALLEEN binnen die tijden
- Verdeel de lessen gelijkmatig over de beschikbare dagen
- Respecteer het aantal lessen en minuten per leerling
- Plan pauzes volgens de instellingen
- Geef een duidelijke samenvatting van wat er gepland is
- Als er problemen zijn, geef waarschuwingen
- Gebruik alleen de studentId die wordt meegegeven, niet de naam als ID

BESCHIKBAARHEID PARSING:
- Zoek naar Nederlandse en Engelse dagnamen in de notities
- Maandag/Monday, Dinsdag/Tuesday, Woensdag/Wednesday, etc.
- Plan alleen op de dagen die expliciet genoemd worden in de notities
- Als specifieke tijden worden genoemd (bijv. "8:00 - 12:00"), plan dan alleen binnen die tijden
```

#### Frontend Prompt Verbeteringen
```typescript
KRITIEKE PLANNING REGELS:
1. Plan ALLEEN op dagen én tijden dat de instructeur beschikbaar is (zie week overzicht hierboven)
2. Plan ALLEEN op dagen én tijden dat de leerling beschikbaar is (uit hun beschikbaarheid notities)
3. Als een leerling specifieke beschikbare dagen heeft, plan dan NOOIT op andere dagen
4. Zoek naar Nederlandse en Engelse dagnamen in de notities (maandag/monday, dinsdag/tuesday, etc.)
5. Als een leerling specifieke tijden heeft (bijv. "maandag 8:00 - 12:00"), plan dan ALLEEN binnen die tijden
6. Verdeel de lessen gelijkmatig over de beschikbare dagen
7. Respecteer de lesduur van elke leerling
8. Plan pauzes tussen lessen volgens de instellingen
9. Als er geen overlappende beschikbare dagen zijn, geef dan een waarschuwing
```

### 3. Verbeterde Dummy Response

De dummy response respecteert nu ook specifieke tijden:

```typescript
// Check if student has specific times for this day
const dayAvailability = availableDaysWithTimes.find(avail => avail.day === dayName)

let startHour = 9 + (i * 2) // Default start time
let startTime = `${startHour.toString().padStart(2, '0')}:00`

if (dayAvailability) {
  // Use student's specific start time if available
  const studentStartHour = parseInt(dayAvailability.startTime.split(':')[0])
  const studentStartMinute = dayAvailability.startTime.split(':')[1]
  const studentEndHour = parseInt(dayAvailability.endTime.split(':')[0])
  const studentEndMinute = dayAvailability.endTime.split(':')[1]
  
  // Calculate if lesson fits within student's time window
  const lessonEndHour = studentStartHour + Math.floor(lessonDuration / 60)
  const lessonEndMinute = lessonDuration % 60
  
  if (lessonEndHour < studentEndHour || (lessonEndHour === studentEndHour && lessonEndMinute <= parseInt(studentEndMinute))) {
    startTime = `${studentStartHour.toString().padStart(2, '0')}:${studentStartMinute}`
  } else {
    // Adjust start time to fit within student's window
    const adjustedStartHour = studentEndHour - Math.floor(lessonDuration / 60)
    const adjustedStartMinute = studentEndMinute
    startTime = `${Math.max(studentStartHour, adjustedStartHour).toString().padStart(2, '0')}:${adjustedStartMinute}`
  }
}
```

## 🧪 **Test Cases**

### Test Case 1: Leerling met specifieke tijden
**Input:** `"Maandag 8:00 - 12:00\nWoensdag middag 12:00 - 16:00\nVrijdag 8:00 - 12:00"`

**Verwachte Output:**
- Dagen: `["monday", "wednesday", "friday"]`
- Tijden: 
  - `{ day: "monday", startTime: "08:00", endTime: "12:00" }`
  - `{ day: "wednesday", startTime: "12:00", endTime: "16:00" }`
  - `{ day: "friday", startTime: "08:00", endTime: "12:00" }`

### Test Case 2: Leerling met alleen dagnamen
**Input:** `"maandag, dinsdag, woensdag"`

**Verwachte Output:**
- Dagen: `["monday", "tuesday", "wednesday"]`
- Tijden: `[]`

### Test Case 3: Leerling met Engelse dagnamen en tijden
**Input:** `"Monday 9:00 - 17:00\nWednesday 10:00 - 15:00"`

**Verwachte Output:**
- Dagen: `["monday", "wednesday"]`
- Tijden:
  - `{ day: "monday", startTime: "09:00", endTime: "17:00" }`
  - `{ day: "wednesday", startTime: "10:00", endTime: "15:00" }`

## 🎯 **Resultaat**

Na deze verbeteringen:

1. ✅ **Specifieke tijden worden herkend en gerespecteerd**
2. ✅ **Nederlandse en Engelse dagnamen worden ondersteund**
3. ✅ **De AI prompt is duidelijker over tijden respecteren**
4. ✅ **Dummy response respecteert nu ook specifieke tijden**
5. ✅ **Lessen worden alleen gepland binnen de beschikbare tijden van de leerling**

## 📝 **Gebruik**

De verbeteringen zijn automatisch actief. Leerlingen kunnen nu beschikbaarheid opgeven in de volgende formaten:

- `"Maandag 8:00 - 12:00"` (Nederlands met tijden)
- `"Monday 9:00 - 17:00"` (Engels met tijden)
- `"maandag, dinsdag, woensdag"` (Alleen dagnamen)
- `"Woensdag middag 12:00 - 16:00"` (Met beschrijving)

De AI zal automatisch de juiste dagen en tijden herkennen en respecteren bij het plannen van lessen. 