import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { AIScheduleLesson } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { lessons, instructorId }: { lessons: AIScheduleLesson[], instructorId: string } = await request.json()
    
    if (!lessons || !Array.isArray(lessons) || lessons.length === 0) {
      return NextResponse.json(
        { error: 'Geen lessen opgegeven' },
        { status: 400 }
      )
    }

    if (!instructorId) {
      return NextResponse.json(
        { error: 'Instructeur ID ontbreekt' },
        { status: 400 }
      )
    }

    // Converteer AI lessen naar database formaat
    const lessonsToInsert = lessons.map(lesson => ({
      date: lesson.date,
      start_time: lesson.startTime,
      end_time: lesson.endTime,
      student_id: lesson.studentId,
      instructor_id: instructorId,
      status: 'scheduled' as const,
      notes: lesson.notes || null
    }))

    // Valideer dat alle lessen geldige data hebben
    const invalidLessons = lessonsToInsert.filter(lesson => 
      !lesson.date || !lesson.start_time || !lesson.end_time || !lesson.student_id
    )
    
    if (invalidLessons.length > 0) {
      return NextResponse.json(
        { error: `${invalidLessons.length} lessen hebben ongeldige data` },
        { status: 400 }
      )
    }

    // Debug: Log de lessen die we gaan toevoegen
    console.log('Attempting to insert lessons:', lessonsToInsert.map(l => ({
      date: l.date,
      start_time: l.start_time,
      end_time: l.end_time,
      student_id: l.student_id,
      instructor_id: l.instructor_id,
      status: l.status,
      notes: l.notes
    })))

    // Voeg lessen toe aan database
    const { data, error } = await supabase
      .from('lessons')
      .insert(lessonsToInsert)
      .select()

    if (error) {
      console.error('Error inserting lessons:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { 
          error: 'Fout bij het toevoegen van lessen',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${lessons.length} lessen succesvol toegevoegd`,
      lessons: data
    })

  } catch (error) {
    console.error('Error in bulk lessons API:', error)
    return NextResponse.json(
      { error: 'Fout bij het toevoegen van lessen' },
      { status: 500 }
    )
  }
} 