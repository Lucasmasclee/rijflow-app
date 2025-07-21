import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instructorId, weekStart } = body

    if (!instructorId || !weekStart) {
      return NextResponse.json(
        { error: 'Instructor ID and week start date are required' },
        { status: 400 }
      )
    }

    // Read the sample input file
    const sampleInputPath = path.join(process.cwd(), 'scripts', 'sample_input.json')
    const sampleInput = JSON.parse(fs.readFileSync(sampleInputPath, 'utf8'))

    // Fetch instructor availability from database
    const { data: instructorAvailability, error: instructorError } = await supabase
      .from('instructor_availability')
      .select('*')
      .eq('instructor_id', instructorId)

    if (instructorError) {
      console.error('Error fetching instructor availability:', instructorError)
      return NextResponse.json(
        { error: 'Failed to fetch instructor availability' },
        { status: 500 }
      )
    }

    // Fetch instructor AI settings from database
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

    // Fetch students with their availability
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

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: 'No students found for this instructor' },
        { status: 404 }
      )
    }

    // Fetch student availability for the selected week
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekEndString = weekEnd.toISOString().split('T')[0]

    // Get all student IDs for this instructor
    const studentIds = students?.map(s => s.id) || []
    
    const { data: studentAvailability, error: availabilityError } = await supabase
      .from('student_availability')
      .select('*')
      .in('student_id', studentIds)
      .gte('week_start', weekStart)
      .lte('week_start', weekEndString)

    if (availabilityError) {
      console.error('Error fetching student availability:', availabilityError)
      // Don't return error here, just log it and continue with empty availability
      console.log('Continuing with empty student availability due to error')
    }

    // Convert instructor availability to the expected format
    const dayNames = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
    const instructorBeschikbaarheid: Record<string, string[]> = {}

    instructorAvailability?.forEach(availability => {
      const dayName = dayNames[availability.day_of_week]
      if (availability.available && availability.start_time && availability.end_time) {
        instructorBeschikbaarheid[dayName] = [availability.start_time, availability.end_time]
      }
    })

    // Generate week dates
    const weekDates = []
    const startDate = new Date(weekStart)
    console.log('Generating week dates from:', weekStart, 'startDate:', startDate)
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const dateString = date.toISOString().split('T')[0]
      weekDates.push(dateString)
      console.log(`Day ${i + 1}: ${dateString}`)
    }
    
    console.log('Generated week dates:', weekDates)

    // Convert students to the expected format and handle missing availability
    const leerlingen = []
    
    for (const student of students || []) {
      // Find availability for this student
      let studentAvail = studentAvailability?.find(av => av.student_id === student.id)
      
      // If no availability found, create empty availability and post to database
      if (!studentAvail) {
        console.log(`Creating empty availability for student ${student.id}`)
        
        const emptyAvailability = {
          student_id: student.id,
          week_start: weekStart,
          notes: JSON.stringify({}) // Empty availability object
        }
        
        const { data: newAvailability, error: insertError } = await supabase
          .from('student_availability')
          .insert(emptyAvailability)
          .select()
          .single()
        
        if (insertError) {
          console.error('Error creating empty availability for student:', insertError)
          // Continue with empty availability even if insert fails
        } else {
          studentAvail = newAvailability
        }
      }
      
      // Convert availability notes to beschikbaarheid format
      const beschikbaarheid: Record<string, string[]> = {}
      if (studentAvail?.notes && studentAvail.notes !== '{}') {
        try {
          const availabilityData = JSON.parse(studentAvail.notes)
          Object.keys(availabilityData).forEach(day => {
            if (availabilityData[day] && availabilityData[day].length === 2) {
              beschikbaarheid[day] = availabilityData[day]
            }
          })
        } catch (e) {
          console.error('Error parsing student availability:', e)
          // If parsing fails, use empty availability
        }
      }

      leerlingen.push({
        id: student.id,
        naam: `${student.first_name} ${student.last_name}`.trim(),
        lessenPerWeek: student.default_lessons_per_week || 1,
        lesDuur: student.default_lesson_duration_minutes || 45,
        beschikbaarheid
      })
    }

    // Create the editable input with database data
    const editableInput = {
      instructeur: {
        beschikbareUren: instructorBeschikbaarheid,
        datums: weekDates,
        maxLessenPerDag: 6, // Default value
        blokuren: aiSettings?.blokuren ?? true,
        pauzeTussenLessen: aiSettings?.pauze_tussen_lessen ?? 10,
        langePauzeDuur: aiSettings?.lange_pauze_duur ?? 0,
        locatiesKoppelen: aiSettings?.locaties_koppelen ?? true
      },
      leerlingen
    }

    // Create a unique filename for this editable input
    const timestamp = Date.now()
    const editableInputPath = path.join(process.cwd(), 'scripts', `editable_input_${timestamp}.json`)
    
    // Write the editable input to file
    fs.writeFileSync(editableInputPath, JSON.stringify(editableInput, null, 2))

    return NextResponse.json({
      success: true,
      editableInputPath: `editable_input_${timestamp}.json`,
      data: editableInput
    })

  } catch (error) {
    console.error('Error creating editable input:', error)
    return NextResponse.json(
      { error: 'Failed to create editable input' },
      { status: 500 }
    )
  }
} 