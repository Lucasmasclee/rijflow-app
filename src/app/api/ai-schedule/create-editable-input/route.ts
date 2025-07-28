import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { weekStart } = await request.json()

    if (!weekStart) {
      return NextResponse.json(
        { error: 'Missing required parameter: weekStart' },
        { status: 400 }
      )
    }

    // Get the current authenticated user from the request headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const instructorId = user.id

    console.log('Loading editable input for instructor:', instructorId, 'week:', weekStart)

    // First, check if instructor_availability exists for this week
    let { data: instructorAvailability, error: availabilityError } = await supabase
      .from('instructor_availability')
      .select('*')
      .eq('instructor_id', instructorId)
      .eq('week_start', weekStart)
      .single()

    let message = null

    // If no instructor_availability exists, create it using standard_availability as fallback
    if (availabilityError && availabilityError.code === 'PGRST116') {
      console.log('No instructor_availability found for week, creating from standard_availability')
      
      // Get standard_availability as fallback
      const { data: standardAvailability, error: standardError } = await supabase
        .from('standard_availability')
        .select('availability_data')
        .eq('instructor_id', instructorId)
        .single()

      let availabilityData = {}
      let settings = {
        maxLessenPerDag: 6,
        blokuren: true,
        pauzeTussenLessen: 10,
        langePauzeDuur: 0,
        locatiesKoppelen: true
      }

      if (standardError && standardError.code === 'PGRST116') {
        // No standard_availability exists, use default values
        console.log('No standard_availability found, using default values')
        availabilityData = {
          maandag: ['09:00', '17:00'],
          dinsdag: ['09:00', '17:00'],
          woensdag: ['09:00', '17:00'],
          donderdag: ['09:00', '17:00'],
          vrijdag: ['09:00', '17:00']
        }
        message = 'New availability created with default values'
      } else if (standardAvailability) {
        // Use standard_availability as fallback
        availabilityData = standardAvailability.availability_data || {}
        message = 'New availability created from standard availability'
      }

      // Create new instructor_availability record
      const { error: createError } = await supabase
        .from('instructor_availability')
        .insert({
          instructor_id: instructorId,
          week_start: weekStart,
          availability_data: availabilityData,
          settings: settings
        })

      if (createError) {
        console.log(instructorId)
        console.error('Error creating instructor_availability:', createError)
        return NextResponse.json(
          { error: 'Failed to create instructor availability: ' + createError.message },
          { status: 500 }
        )
      }

      // Fetch the newly created record
      const { data: newAvailability, error: fetchError } = await supabase
        .from('instructor_availability')
        .select('*')
        .eq('instructor_id', instructorId)
        .eq('week_start', weekStart)
        .single()

      if (fetchError) {
        console.error('Error fetching newly created availability:', fetchError)
        return NextResponse.json(
          { error: 'Failed to fetch newly created availability: ' + fetchError.message },
          { status: 500 }
        )
      }

      instructorAvailability = newAvailability
    } else if (availabilityError) {
      console.error('Error fetching instructor_availability:', availabilityError)
      return NextResponse.json(
        { error: 'Failed to fetch instructor availability: ' + availabilityError.message },
        { status: 500 }
      )
    }

    // Get students for this instructor
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('instructor_id', instructorId)
      .order('first_name', { ascending: true })

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch students: ' + studentsError.message },
        { status: 500 }
      )
    }

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: 'No students found for this instructor' },
        { status: 400 }
      )
    }

    // Get student availability for this week
    const { data: studentAvailability, error: studentAvailError } = await supabase
      .from('student_availability')
      .select('*')
      .in('student_id', students.map(s => s.id))
      .eq('week_start', weekStart)

    if (studentAvailError) {
      console.error('Error fetching student availability:', studentAvailError)
      // Don't fail here, just log the error
    }

    // Build the response data structure
    const instructorData = {
      beschikbareUren: instructorAvailability.availability_data || {},
      datums: generateWeekDates(weekStart),
      maxLessenPerDag: instructorAvailability.settings?.maxLessenPerDag || 6,
      blokuren: instructorAvailability.settings?.blokuren ?? true,
      pauzeTussenLessen: instructorAvailability.settings?.pauzeTussenLessen || 10,
      langePauzeDuur: instructorAvailability.settings?.langePauzeDuur || 0,
      locatiesKoppelen: instructorAvailability.settings?.locatiesKoppelen ?? true
    }

    const studentsData = students.map(student => {
      // Find student availability for this week
      const studentAvail = studentAvailability?.find(sa => sa.student_id === student.id)
      
      return {
        id: student.id,
        naam: student.last_name ? `${student.first_name} ${student.last_name}` : student.first_name,
        lessenPerWeek: student.default_lessons_per_week || 2,
        lesDuur: student.default_lesson_duration_minutes || 60,
        beschikbaarheid: studentAvail?.availability_data || {}
      }
    })

    const responseData = {
      instructeur: instructorData,
      leerlingen: studentsData
    }

    return NextResponse.json({
      data: responseData,
      message: message
    })

  } catch (error) {
    console.error('Error in create-editable-input:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}

// Helper function to generate week dates from week start
function generateWeekDates(weekStart: string): string[] {
  const startDate = new Date(weekStart)
  const dates = []
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    dates.push(date.toISOString().split('T')[0])
  }
  
  return dates
} 