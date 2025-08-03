import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting generate-planning API call')
    
    const { weekStart, instructorId } = await request.json()
    console.log('Received data:', { weekStart, instructorId })

    if (!weekStart || !instructorId) {
      console.error('Missing required parameters')
      return NextResponse.json(
        { error: 'weekStart and instructorId are required' },
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
    
    // Create Supabase client with the token (same pattern as create-editable-input)
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

    console.log('Supabase client initialized with auth token')

    // Get instructor availability for the specific week
    console.log('Fetching instructor availability...')
    const { data: instructorAvailability, error: instructorError } = await supabase
      .from('instructor_availability')
      .select('*')
      .eq('instructor_id', instructorId)
      .eq('week_start', weekStart)
      .single()

    if (instructorError && instructorError.code !== 'PGRST116') {
      console.error('Error fetching instructor availability:', instructorError)
      return NextResponse.json(
        { error: 'Failed to fetch instructor availability' },
        { status: 500 }
      )
    }

    console.log('Instructor availability:', instructorAvailability)

    // Get AI settings for the instructor
    console.log('Fetching AI settings...')
    const { data: aiSettings, error: aiSettingsError } = await supabase
      .from('instructor_ai_settings')
      .select('*')
      .eq('instructor_id', instructorId)
      .single()

    if (aiSettingsError && aiSettingsError.code !== 'PGRST116') {
      console.error('Error fetching AI settings:', aiSettingsError)
      return NextResponse.json(
        { error: 'Failed to fetch AI settings' },
        { status: 500 }
      )
    }

    console.log('AI settings:', aiSettings)

    // Get all students for this instructor
    console.log('Fetching students...')
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('instructor_id', instructorId)

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }

    console.log('Students found:', students?.length || 0)

    // Get student availability for the specific week
    console.log('Fetching student availability...')
    const { data: studentAvailability, error: studentAvailabilityError } = await supabase
      .from('student_availability')
      .select('*')
      .eq('week_start', weekStart)

    if (studentAvailabilityError) {
      console.error('Error fetching student availability:', studentAvailabilityError)
      return NextResponse.json(
        { error: 'Failed to fetch student availability' },
        { status: 500 }
      )
    }

    console.log('Student availability found:', studentAvailability?.length || 0)

    // Generate week dates (Monday to Sunday)
    const weekStartDate = new Date(weekStart)
    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate)
      date.setDate(weekStartDate.getDate() + i)
      weekDates.push(date.toISOString().split('T')[0])
    }

    console.log('Week dates generated:', weekDates)

    // Build instructor availability data
    const beschikbareUren: Record<string, string[]> = {}
    
    if (instructorAvailability) {
      // Parse availability_data if it's a JSON string
      let availabilityData = {}
      if (instructorAvailability.availability_data) {
        if (typeof instructorAvailability.availability_data === 'string') {
          try {
            availabilityData = JSON.parse(instructorAvailability.availability_data)
          } catch (error) {
            console.error('Error parsing instructor availability_data JSON:', error)
            availabilityData = {}
          }
        } else {
          availabilityData = instructorAvailability.availability_data
        }
      }
      
      for (const [day, times] of Object.entries(availabilityData)) {
        if (Array.isArray(times) && times.length >= 2) {
          beschikbareUren[day] = times
        }
      }
    }

    console.log('Instructor availability built:', beschikbareUren)

    // Build students data
    const leerlingen = []
    
    for (const student of students || []) {
      // Find student availability for this week
      const studentAvail = studentAvailability?.find(sa => sa.student_id === student.id)
      
      const beschikbaarheid: Record<string, string[]> = {}
      
      if (studentAvail && studentAvail.availability_data) {
        // Parse student availability_data if it's a JSON string
        let studentAvailabilityData = {}
        if (typeof studentAvail.availability_data === 'string') {
          try {
            studentAvailabilityData = JSON.parse(studentAvail.availability_data)
          } catch (error) {
            console.error('Error parsing student availability_data JSON:', error)
            studentAvailabilityData = {}
          }
        } else {
          studentAvailabilityData = studentAvail.availability_data
        }
        
        for (const [day, times] of Object.entries(studentAvailabilityData)) {
          if (Array.isArray(times) && times.length >= 2) {
            beschikbaarheid[day] = times
          }
        }
      }

      leerlingen.push({
        id: student.id,
        naam: student.last_name ? `${student.first_name} ${student.last_name}` : student.first_name,
        lessenPerWeek: student.default_lessons_per_week || 2,
        lesDuur: student.default_lesson_duration_minutes || 60,
        beschikbaarheid
      })
    }

    console.log('Students data built:', leerlingen.length, 'students')

    // Create the sample input structure (exact same format as sample_input.json)
    const sampleInput = {
      instructeur: {
        beschikbareUren,
        datums: weekDates,
        blokuren: aiSettings?.blokuren ?? true,
        pauzeTussenLessen: aiSettings?.pauze_tussen_lessen ?? 10,
        langePauzeDuur: aiSettings?.lange_pauze_duur ?? 0,
        locatiesKoppelen: aiSettings?.locaties_koppelen ?? true
      },
      leerlingen
    }

    console.log('Sample input structure created')

    // Run the planning generation script
    console.log('Running planning generation script...')
    
    try {
      // Import the planning generation function directly
      const { generate_planning_from_data } = require('../../../../lib/generate_week_planning.js')
      
      // Generate the planning
      const planningResult = generate_planning_from_data(sampleInput)
      
      console.log('Planning generated successfully')
      
      return NextResponse.json({
        success: true,
        data: planningResult,
        inputData: sampleInput,
        message: 'Planning generated successfully'
      })
      
    } catch (error) {
      console.error('Error generating planning:', error)
      return NextResponse.json(
        { error: 'Failed to generate planning', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error generating planning:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 