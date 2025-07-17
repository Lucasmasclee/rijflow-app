import OpenAI from 'openai'

// Debug logging
console.log('OpenAI API Key check:', {
  hasKey: !!process.env.OPENAI_API_KEY,
  keyLength: process.env.OPENAI_API_KEY?.length || 0,
  keyStart: process.env.OPENAI_API_KEY?.substring(0, 10) + '...' || 'undefined'
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

export interface AIScheduleRequest {
  instructorAvailability: {
    day: string
    available: boolean
    startTime: string
    endTime: string
  }[]
  students: {
    id: string
    firstName: string
    lastName: string
    lessons: number
    minutes: number
    aiNotes: string
    notes: string
  }[]
  settings: {
    connectLocations: boolean
    numberOfBreaks: number
    minutesPerBreak: number
    minutesBreakEveryLesson: number
    breakAfterEachStudent: boolean
    additionalSpecifications: string
  }
  customPrompt?: string
}

export interface AIScheduleLesson {
  date: string
  startTime: string
  endTime: string
  studentId: string
  studentName: string
  notes?: string
}

export interface AIScheduleResponse {
  lessons: AIScheduleLesson[]
  summary: string
  warnings?: string[]
}

export async function generateAISchedule(request: AIScheduleRequest, customPrompt?: string): Promise<AIScheduleResponse> {
  try {
    // Debug logging voor API key check
    console.log('Checking OpenAI API key in generateAISchedule:', {
      hasKey: !!process.env.OPENAI_API_KEY,
      keyLength: process.env.OPENAI_API_KEY?.length || 0,
      keyStart: process.env.OPENAI_API_KEY?.substring(0, 10) + '...' || 'undefined'
    })
    
    // Controleer of API key is ingesteld
    if (!process.env.OPENAI_API_KEY) {
      console.log('No OpenAI API key found, returning dummy response')
      // Return dummy response voor development/testing
      return generateDummyResponse(request)
    }

    // Gebruik custom prompt als die is meegegeven, anders genereer een nieuwe
    const prompt = customPrompt || generateSchedulePrompt(request)
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Je bent een expert rijschool planner. Je krijgt informatie over een instructeur, leerlingen en instellingen. 
          Maak een optimaal lesrooster voor de komende week (maandag t/m vrijdag) en geef het terug als JSON.
          
          BELANGRIJK: Je moet ALTIJD een geldig JSON object teruggeven in het exacte formaat dat wordt gevraagd.
          Geef geen extra tekst, uitleg of markdown formatting - alleen pure JSON.
          
          KRITIEKE REGELS:
          - Plan ALLEEN op dagen dat de instructeur beschikbaar is
          - Plan ALLEEN op dagen dat de leerling beschikbaar is (uit hun notities)
          - Als een leerling specifieke beschikbare dagen heeft, plan dan NOOIT op andere dagen
          - Als er geen overlappende beschikbare dagen zijn, geef dan een waarschuwing
          - Respecteer het aantal lessen en minuten per leerling
          - Plan pauzes volgens de instellingen
          - Geef een duidelijke samenvatting van wat er gepland is
          - Als er problemen zijn, geef waarschuwingen
          - Gebruik alleen de studentId die wordt meegegeven, niet de naam als ID
          
          BESCHIKBAARHEID PARSING:
          - Zoek naar Nederlandse en Engelse dagnamen in de notities
          - Maandag/Monday, Dinsdag/Tuesday, Woensdag/Wednesday, etc.
          - Plan alleen op de dagen die expliciet genoemd worden in de notities`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('Geen response van AI')
    }

    // Probeer JSON te parsen
    try {
      const parsedResponse = JSON.parse(response)
      return {
        lessons: parsedResponse.lessons || [],
        summary: parsedResponse.summary || 'Rooster gegenereerd',
        warnings: parsedResponse.warnings || []
      }
    } catch (parseError) {
      // Als JSON parsing faalt, probeer de response te reparsen
      return parseAIResponse(response)
    }

  } catch (error) {
    console.error('Error generating AI schedule:', error)
    throw new Error('Fout bij het genereren van het rooster')
  }
}

function generateSchedulePrompt(request: AIScheduleRequest): string {
  const { instructorAvailability, students, settings } = request
  
  // Instructeur beschikbaarheid
  const availabilityText = instructorAvailability
    .filter(day => day.available)
    .map(day => `${day.day}: ${day.startTime} - ${day.endTime}`)
    .join(', ')

  // Leerlingen informatie
  const studentsText = students.map(student => {
    const availabilityNotes = student.notes ? `\nBeschikbaarheid: ${student.notes}` : ''
    const aiNotes = student.aiNotes ? `\nAI Notities: ${student.aiNotes}` : ''
    
    return `- ${student.firstName} ${student.lastName}:
  ${student.lessons} lessen van ${student.minutes} minuten per week${availabilityNotes}${aiNotes}`
  }).join('\n')

  // Instellingen
  const settingsText = `
Instellingen:
- Locaties verbinden: ${settings.connectLocations ? 'Ja' : 'Nee'}
- Aantal pauzes per dag: ${settings.numberOfBreaks}
- Minuten per pauze: ${settings.minutesPerBreak}
- Minuten pauze tussen lessen: ${settings.minutesBreakEveryLesson}
- Pauze na elke leerling: ${settings.breakAfterEachStudent ? 'Ja' : 'Nee'}
${settings.additionalSpecifications ? `- Extra specificaties: ${settings.additionalSpecifications}` : ''}

KRITIEKE BESCHIKBAARHEID REGELS:
- Plan ALLEEN op dagen dat de instructeur beschikbaar is
- Plan ALLEEN op dagen dat de leerling beschikbaar is (uit hun notities)
- Als een leerling specifieke beschikbare dagen heeft, plan dan NOOIT op andere dagen
- Als er geen overlappende beschikbare dagen zijn, geef dan een waarschuwing
- Zoek naar Nederlandse en Engelse dagnamen in de notities (maandag/monday, dinsdag/tuesday, etc.)

BELANGRIJK: Geef ALTIJD een geldig JSON object terug in exact dit formaat, zonder extra tekst ervoor of erna:

{
  "lessons": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM", 
      "studentId": "student-id",
      "studentName": "Voornaam Achternaam",
      "notes": "Optionele notities"
    }
  ],
  "summary": "Samenvatting van het rooster",
  "warnings": ["Eventuele waarschuwingen"]
}

Instructeur beschikbaarheid: ${availabilityText}

Leerlingen:
${studentsText}
`

  return settingsText
}

function parseAIResponse(response: string): AIScheduleResponse {
  console.log('Attempting to parse AI response:', response)
  
  // Probeer JSON te extraheren uit de response
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      console.log('Successfully parsed JSON:', parsed)
      return {
        lessons: parsed.lessons || [],
        summary: parsed.summary || 'Rooster gegenereerd',
        warnings: parsed.warnings || []
      }
    } catch (error) {
      console.error('Error parsing JSON from AI response:', error)
    }
  }

  // Probeer alternatieve JSON formaten
  try {
    // Zoek naar JSON arrays
    const arrayMatch = response.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      const parsed = JSON.parse(arrayMatch[0])
      console.log('Found JSON array:', parsed)
      return {
        lessons: Array.isArray(parsed) ? parsed : [],
        summary: 'Rooster gegenereerd uit array formaat',
        warnings: ['AI response was in array formaat']
      }
    }
  } catch (error) {
    console.error('Error parsing array from AI response:', error)
  }

  // Fallback: maak een basis response
  console.log('Could not parse AI response, using fallback')
  return {
    lessons: [],
    summary: 'Kon het AI response niet verwerken. Probeer het opnieuw.',
    warnings: ['AI response kon niet worden geparsed', 'Response: ' + response.substring(0, 200) + '...']
  }
}

// Dummy response voor development/testing
function generateDummyResponse(request: AIScheduleRequest): AIScheduleResponse {
  const { students, instructorAvailability } = request
  
  // Genereer dummy lessen voor de komende week
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() + (8 - today.getDay()) % 7) // Volgende maandag
  
  const lessons: AIScheduleLesson[] = []
  const warnings: string[] = ['Dit is een dummy response. Voeg OPENAI_API_KEY toe voor echte AI planning.']
  
  students.forEach((student, studentIndex) => {
    const studentLessons = student.lessons
    const lessonDuration = student.minutes
    
    // Parse student availability from notes
    const studentNotes = student.notes?.toLowerCase() || ''
    const availableDays = parseStudentAvailability(studentNotes)
    
    // Get instructor available days
    const instructorAvailableDays = instructorAvailability
      .filter(day => day.available)
      .map(day => day.day)
    
    // Find common available days
    const commonAvailableDays = availableDays.length > 0 
      ? availableDays.filter(day => instructorAvailableDays.includes(day))
      : instructorAvailableDays
    
    if (commonAvailableDays.length === 0) {
      warnings.push(`⚠️ Geen overlappende beschikbare dagen gevonden voor ${student.firstName}. Gebruik instructeur beschikbaarheid.`)
    }
    
    // Use common available days or fallback to instructor availability
    const daysToUse = commonAvailableDays.length > 0 ? commonAvailableDays : instructorAvailableDays
    
    for (let i = 0; i < studentLessons; i++) {
      const dayIndex = i % daysToUse.length
      const dayName = daysToUse[dayIndex]
      
      const lessonDate = new Date(monday)
      const dayOffset = getDayOffset(dayName)
      lessonDate.setDate(monday.getDate() + dayOffset)
      
      const startHour = 9 + (i * 2) // Start om 9:00, 11:00, 13:00, etc.
      const startTime = `${startHour.toString().padStart(2, '0')}:00`
      const endHour = startHour + Math.floor(lessonDuration / 60)
      const endMinute = lessonDuration % 60
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
      
      lessons.push({
        date: lessonDate.toISOString().split('T')[0],
        startTime,
        endTime,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        notes: student.aiNotes || undefined
      })
    }
  })
  
  return {
    lessons,
    summary: `Dummy rooster gegenereerd met ${lessons.length} lessen voor ${students.length} leerlingen`,
    warnings
  }
}

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

// Helper function to get day offset from day name
function getDayOffset(dayName: string): number {
  const dayMap: { [key: string]: number } = {
    'monday': 0,
    'tuesday': 1,
    'wednesday': 2,
    'thursday': 3,
    'friday': 4,
    'saturday': 5,
    'sunday': 6
  }
  return dayMap[dayName] || 0
} 