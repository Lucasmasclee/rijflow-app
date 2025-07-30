import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(request: NextRequest) {
  try {
    const { weekStart, instructorId } = await request.json()

    if (!weekStart || !instructorId) {
      return NextResponse.json(
        { error: 'weekStart and instructorId are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Get instructor availability for the specific week
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

    // Get AI settings for the instructor
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

    // Get all students for this instructor
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

    // Get student availability for the specific week
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

    // Generate week dates (Monday to Sunday)
    const weekStartDate = new Date(weekStart)
    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate)
      date.setDate(weekStartDate.getDate() + i)
      weekDates.push(date.toISOString().split('T')[0])
    }

    // Build instructor availability data
    const beschikbareUren: Record<string, string[]> = {}
    
    if (instructorAvailability) {
      const availabilityData = instructorAvailability.availability_data || {}
      for (const [day, times] of Object.entries(availabilityData)) {
        if (Array.isArray(times) && times.length >= 2) {
          beschikbareUren[day] = times
        }
      }
    }

    // Build students data
    const leerlingen = []
    
    for (const student of students) {
      // Find student availability for this week
      const studentAvail = studentAvailability.find(sa => sa.student_id === student.id)
      
      const beschikbaarheid: Record<string, string[]> = {}
      
      if (studentAvail && studentAvail.availability_data) {
        for (const [day, times] of Object.entries(studentAvail.availability_data)) {
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

    // Create a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `week_planning_input_${timestamp}.json`
    const filePath = path.join(process.cwd(), 'src', 'app', 'dashboard', 'ai-schedule', 'generated', filename)

    // Write the file
    try {
      fs.writeFileSync(filePath, JSON.stringify(sampleInput, null, 2))
      console.log(`Input file created: ${filename}`)
    } catch (writeError) {
      console.error('Error writing file:', writeError)
      return NextResponse.json(
        { error: 'Failed to create input file' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sampleInput,
      filename: filename,
      message: 'Input file created successfully'
    })

  } catch (error) {
    console.error('Error creating input file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 