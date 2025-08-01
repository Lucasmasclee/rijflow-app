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
  summary?: string
  warnings?: string[]
  leerlingen_zonder_les?: Record<string, number>
  schedule_details?: {
    lessen: number
    totale_minuten_tussen_lessen: number
  }
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
      throw new Error('OpenAI API key is niet geconfigureerd. Voeg OPENAI_API_KEY toe aan je environment variables.')
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
          - Als specifieke tijden worden genoemd (bijv. "8:00 - 12:00"), plan dan alleen binnen die tijden`
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
- Plan ALLEEN op dagen dat de leerling beschikbaar is (uit hun beschikbaarheid notities)
- Als een leerling specifieke beschikbare dagen heeft, plan dan NOOIT op andere dagen
- Zoek naar Nederlandse en Engelse dagnamen in de notities (maandag/monday, dinsdag/tuesday, etc.)
- Als een leerling specifieke tijden heeft (bijv. "maandag 8:00 - 12:00"), plan dan ALLEEN binnen die tijden
- Verdeel de lessen gelijkmatig over de beschikbare dagen
- Respecteer de lesduur van elke leerling
- Plan pauzes tussen lessen volgens de instellingen
- Als er geen overlappende beschikbare dagen zijn, geef dan een waarschuwing

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