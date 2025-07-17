import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AIScheduleLesson } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    // Debug: Log all headers to see what's being sent
    console.log('=== BULK LESSONS API DEBUG ===')
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    
    const { lessons, instructorId }: { lessons: AIScheduleLesson[], instructorId: string } = await request.json()
    
    console.log('Request body:', { lessons: lessons?.length, instructorId })
    
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

    // Get the authorization header (JWT token)
    const authHeader = request.headers.get('authorization')
    console.log('Auth header:', authHeader ? 'Present' : 'Missing')
    
    // TEMPORARY: Allow requests without auth for debugging
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth header validation failed:', { 
        hasHeader: !!authHeader, 
        startsWithBearer: authHeader?.startsWith('Bearer ') 
      })
      console.log('⚠️ TEMPORARY: Allowing request without auth for debugging')
      // return NextResponse.json(
      //   { error: 'Geen geldige authenticatie token' },
      //   { status: 401 }
      // )
    }

    const token = authHeader?.replace('Bearer ', '') || ''
    console.log('Token length:', token.length)
    console.log('Token preview:', token.substring(0, 20) + '...')

    // Create Supabase client with user's JWT token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing')
    console.log('Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'Missing')
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      }
    })

    // Test the token by getting the current user (only if token exists)
    if (token) {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('User from token:', user ? { id: user.id, email: user.email } : 'No user')
      console.log('User error:', userError)

      if (userError) {
        console.log('Token validation failed:', userError)
        return NextResponse.json(
          { error: 'Ongeldige authenticatie token', details: userError.message },
          { status: 401 }
        )
      }

      if (!user) {
        console.log('No user found from token')
        return NextResponse.json(
          { error: 'Geen gebruiker gevonden' },
          { status: 401 }
        )
      }
    } else {
      console.log('⚠️ TEMPORARY: No token provided, proceeding without auth')
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

    console.log('Successfully inserted lessons:', data?.length)
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