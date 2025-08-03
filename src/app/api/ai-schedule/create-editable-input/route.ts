import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    
    // Create Supabase client with the token (same pattern as lessons/bulk/route.ts)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const instructorId = user.id

    console.log('=== DEBUGGING AUTH/INSTRUCTOR ID ===')
    console.log('Auth user ID:', user.id)
    console.log('Auth user email:', user.email)
    console.log('Instructor ID being used:', instructorId)
    console.log('Week start:', weekStart)
    console.log('=====================================')

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
        // Parse standard availability_data if it's a JSON string
        if (typeof standardAvailability.availability_data === 'string') {
          try {
            availabilityData = JSON.parse(standardAvailability.availability_data)
            message = 'New availability created from standard availability'
          } catch (error) {
            console.error('Error parsing standard availability_data JSON:', error)
            availabilityData = {
              maandag: ['09:00', '17:00'],
              dinsdag: ['09:00', '17:00'],
              woensdag: ['09:00', '17:00'],
              donderdag: ['09:00', '17:00'],
              vrijdag: ['09:00', '17:00']
            }
            message = 'New availability created with default values (parsing error)'
          }
        } else {
          availabilityData = standardAvailability.availability_data || {}
          message = 'New availability created from standard availability'
        }
      }









      // Create new instructor_availability record
      console.log('=== CREATING INSTRUCTOR_AVAILABILITY ===')
      console.log('Attempting to create record with:')
      console.log('- instructor_id:', instructorId)
      console.log('- week_start:', weekStart)
      console.log('- availability_data:', JSON.stringify(availabilityData))
      console.log('- settings:', JSON.stringify(settings))
      console.log('==========================================')

      const { error } = await supabase
        .from('instructor_availability')
        .upsert({
          instructor_id: instructorId,
          week_start: weekStart,
          availability_data: availabilityData,
          settings: settings
        })

        // const { error } = await supabase
        // .from('standard_availability')
        // .upsert({
        //   instructor_id: user.id,
        //   availability_data: availabilityData,
        //   default_lesson_duration: defaultLessonDuration
        // }, { 
        //   onConflict: 'instructor_id',
        //   ignoreDuplicates: false 
        // })










      if (error) {
        console.log('=== ERROR CREATING INSTRUCTOR_AVAILABILITY ===')
        console.log('Instructor ID that caused error:', instructorId)
        console.log('Full error object:', error)
        console.log('Error message:', error.message)
        console.log('Error details:', error.details)
        console.log('Error hint:', error.hint)
        console.log('===============================================')
        console.error('Error creating instructor_availability:', error)
        
        return NextResponse.json(
          { 
            error: 'Failed to create instructor availability: ' + error.message
          },
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
    // Parse availability_data if it's a JSON string
    let parsedAvailabilityData = {}
    if (instructorAvailability.availability_data) {
      if (typeof instructorAvailability.availability_data === 'string') {
        try {
          parsedAvailabilityData = JSON.parse(instructorAvailability.availability_data)
        } catch (error) {
          console.error('Error parsing availability_data JSON:', error)
          parsedAvailabilityData = {}
        }
      } else {
        parsedAvailabilityData = instructorAvailability.availability_data
      }
    }

    // Parse settings if it's a JSON string
    let parsedSettings = {
      maxLessenPerDag: 6,
      blokuren: true,
      pauzeTussenLessen: 10,
      langePauzeDuur: 0,
      locatiesKoppelen: true
    }
    
    if (instructorAvailability.settings) {
      if (typeof instructorAvailability.settings === 'string') {
        try {
          const parsedSettingsData = JSON.parse(instructorAvailability.settings)
          parsedSettings = { ...parsedSettings, ...parsedSettingsData }
        } catch (error) {
          console.error('Error parsing settings JSON:', error)
        }
      } else {
        parsedSettings = { ...parsedSettings, ...instructorAvailability.settings }
      }
    }

    const instructorData = {
      beschikbareUren: parsedAvailabilityData,
      datums: generateWeekDates(weekStart),
      maxLessenPerDag: parsedSettings.maxLessenPerDag || 6,
      blokuren: parsedSettings.blokuren ?? true,
      pauzeTussenLessen: parsedSettings.pauzeTussenLessen || 10,
      langePauzeDuur: parsedSettings.langePauzeDuur || 0,
      locatiesKoppelen: parsedSettings.locatiesKoppelen ?? true
    }

    const studentsData = students.map(student => {
      // Find student availability for this week
      const studentAvail = studentAvailability?.find(sa => sa.student_id === student.id)
      
      // Parse student availability_data if it's a JSON string
      let parsedStudentAvailability = {}
      if (studentAvail?.availability_data) {
        if (typeof studentAvail.availability_data === 'string') {
          try {
            parsedStudentAvailability = JSON.parse(studentAvail.availability_data)
          } catch (error) {
            console.error('Error parsing student availability_data JSON:', error)
            parsedStudentAvailability = {}
          }
        } else {
          parsedStudentAvailability = studentAvail.availability_data
        }
      }
      
      return {
        id: student.id,
        naam: student.last_name ? `${student.first_name} ${student.last_name}` : student.first_name,
        lessenPerWeek: student.default_lessons_per_week || 2,
        lesDuur: student.default_lesson_duration_minutes || 60,
        beschikbaarheid: parsedStudentAvailability
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