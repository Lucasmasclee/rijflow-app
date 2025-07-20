import { NextRequest, NextResponse } from 'next/server'
import { generateAISchedule } from '@/lib/openai'

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Genereer test data voor een week planning
    const today = new Date()
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7) // Volgende maandag
    
    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(nextMonday)
      date.setDate(nextMonday.getDate() + i)
      weekDates.push(date.toISOString().slice(0, 10))
    }

    // Test instructeur beschikbaarheid (maandag t/m vrijdag)
    const instructorAvailability = [
      { day: 'monday', available: true, startTime: '09:00', endTime: '17:00' },
      { day: 'tuesday', available: true, startTime: '09:00', endTime: '17:00' },
      { day: 'wednesday', available: true, startTime: '09:00', endTime: '17:00' },
      { day: 'thursday', available: true, startTime: '09:00', endTime: '17:00' },
      { day: 'friday', available: true, startTime: '09:00', endTime: '17:00' },
      { day: 'saturday', available: false, startTime: '09:00', endTime: '17:00' },
      { day: 'sunday', available: false, startTime: '09:00', endTime: '17:00' },
    ]

    // Test leerlingen
    const testStudents = [
      {
        id: 'test-student-1',
        firstName: 'Jan',
        lastName: 'Jansen',
        lessons: 2,
        minutes: 60,
        aiNotes: 'Test leerling 1',
        notes: 'Maandag, woensdag beschikbaar'
      },
      {
        id: 'test-student-2',
        firstName: 'Piet',
        lastName: 'Pietersen',
        lessons: 3,
        minutes: 90,
        aiNotes: 'Test leerling 2',
        notes: 'Dinsdag, donderdag, vrijdag beschikbaar'
      },
      {
        id: 'test-student-3',
        firstName: 'Anna',
        lastName: 'de Vries',
        lessons: 1,
        minutes: 45,
        aiNotes: 'Test leerling 3',
        notes: 'Alleen woensdag beschikbaar'
      }
    ]

    // Test instellingen
    const testSettings = {
      connectLocations: true,
      numberOfBreaks: 2,
      minutesPerBreak: 15,
      minutesBreakEveryLesson: 5,
      breakAfterEachStudent: false,
      sendNotifications: false,
      additionalSpecifications: 'Test planning met AI'
    }

    // Maak de request data
    const requestData = {
      instructorAvailability,
      students: testStudents,
      settings: testSettings
    }

    console.log('Generating test AI schedule with data:', requestData)

    // Genereer het rooster met AI
    const aiResponse = await generateAISchedule(requestData)

    console.log('Test AI schedule generated successfully')

    return NextResponse.json(aiResponse)

  } catch (error) {
    console.error('Error generating test AI schedule:', error)
    return NextResponse.json(
      { 
        error: 'Fout bij het genereren van het test rooster',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 