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

    // Valideer leerling data met specifieke error messages
    // Alleen voornaam is verplicht, achternaam is optioneel
    const invalidStudents = []
    
    for (const student of body.students) {
      const errors = []
      
      if (!student.id) errors.push('ID ontbreekt')
      if (!student.firstName || student.firstName.trim() === '') errors.push('Voornaam ontbreekt')
      // Achternaam is optioneel, dus geen validatie nodig
      if (!student.lessons || student.lessons < 1) errors.push('Aantal lessen moet minimaal 1 zijn')
      if (!student.minutes || student.minutes < 30) errors.push('Lesduur moet minimaal 30 minuten zijn')
      
      if (errors.length > 0) {
        invalidStudents.push({
          student: `${student.firstName || 'Onbekend'} ${student.lastName || ''}`,
          errors
        })
      }
    }
    
    if (invalidStudents.length > 0) {
      const errorDetails = invalidStudents.map(s => 
        `${s.student}: ${s.errors.join(', ')}`
      ).join('; ')
      
      return NextResponse.json(
        { 
          error: `${invalidStudents.length} leerlingen hebben ongeldige data`,
          details: errorDetails
        },
        { status: 400 }
      )
    }

    // Genereer het rooster met AI - gebruik custom prompt als die is meegegeven
    const aiResponse = await generateAISchedule(body, body.customPrompt)

    return NextResponse.json(aiResponse)

  } catch (error) {
    console.error('Error in AI schedule API:', error)
    return NextResponse.json(
      { error: 'Fout bij het genereren van het rooster' },
      { status: 500 }
    )
  }
} 