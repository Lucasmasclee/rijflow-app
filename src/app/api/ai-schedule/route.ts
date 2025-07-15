import { NextRequest, NextResponse } from 'next/server'
import { generateAISchedule, AIScheduleRequest } from '@/lib/openai'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body: AIScheduleRequest = await request.json()
    
    // Valideer de request
    if (!body.instructorAvailability || !body.students || !body.settings) {
      return NextResponse.json(
        { error: 'Ongeldige request data' },
        { status: 400 }
      )
    }

    // Controleer of er leerlingen zijn
    if (body.students.length === 0) {
      return NextResponse.json(
        { error: 'Geen leerlingen opgegeven' },
        { status: 400 }
      )
    }

    // Controleer of de instructeur beschikbaar is
    const availableDays = body.instructorAvailability.filter(day => day.available)
    if (availableDays.length === 0) {
      return NextResponse.json(
        { error: 'Instructeur is niet beschikbaar op enige dag' },
        { status: 400 }
      )
    }

    // Genereer het rooster met AI
    const aiResponse = await generateAISchedule(body)

    return NextResponse.json(aiResponse)

  } catch (error) {
    console.error('Error in AI schedule API:', error)
    return NextResponse.json(
      { error: 'Fout bij het genereren van het rooster' },
      { status: 500 }
    )
  }
} 