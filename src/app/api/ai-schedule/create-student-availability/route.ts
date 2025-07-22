import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { weekStart, instructorId } = await request.json()

    if (!weekStart || !instructorId) {
      return NextResponse.json(
        { error: 'Missing required parameters: weekStart and instructorId' },
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

    console.log('Authenticated user:', user.id)
    console.log('Requested instructor ID:', instructorId)

    // Verify that the user is the instructor
    if (user.id !== instructorId) {
      console.error('User ID mismatch:', { userId: user.id, instructorId })
      return NextResponse.json(
        { error: 'Unauthorized: You can only create availability for your own students' },
        { status: 403 }
      )
    }

    console.log('Creating student availability for instructor:', instructorId, 'week:', weekStart)

    // Get all students for this instructor
    console.log('Fetching students for instructor:', instructorId)
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, first_name, last_name, instructor_id')
      .eq('instructor_id', instructorId)

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch students: ' + studentsError.message },
        { status: 500 }
      )
    }

    console.log('Found students:', students?.length || 0)
    if (students && students.length > 0) {
      console.log('Student details:', students.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, instructor_id: s.instructor_id })))
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No students found for this instructor',
        createdRecords: 0
      })
    }

    // Get existing student availability records for this week
    console.log('Checking for existing availability with week_start:', weekStart, 'type:', typeof weekStart)
    
    const { data: existingAvailability, error: availabilityError } = await supabase
      .from('student_availability')
      .select('student_id, week_start')
      .in('student_id', students.map(s => s.id))
      .eq('week_start', weekStart)

    if (availabilityError) {
      console.error('Error fetching existing availability:', availabilityError)
      return NextResponse.json(
        { error: 'Failed to fetch existing availability: ' + availabilityError.message },
        { status: 500 }
      )
    }

    // Find students that don't have availability records for this week
    const existingStudentIds = existingAvailability?.map(sa => sa.student_id) || []
    const missingStudents = students.filter(s => !existingStudentIds.includes(s.id))
    
    console.log('Existing availability records found:', existingAvailability?.length || 0)
    console.log('Existing records:', existingAvailability)
    console.log('Missing students:', missingStudents.map(s => `${s.first_name} ${s.last_name}`))

    if (missingStudents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All students already have availability records for this week',
        createdRecords: 0
      })
    }

    // Get standard availability for this instructor to use as default
    const { data: standardAvailability, error: standardError } = await supabase
      .from('standard_availability')
      .select('availability_data')
      .eq('instructor_id', instructorId)
      .single()

    // Default availability if no standard availability exists
    let defaultAvailability = {
      maandag: ["09:00", "17:00"],
      dinsdag: ["09:00", "17:00"],
      woensdag: ["09:00", "17:00"],
      donderdag: ["09:00", "17:00"],
      vrijdag: ["09:00", "17:00"]
    }

    // Use standard availability if it exists
    if (standardAvailability && !standardError && standardAvailability.availability_data) {
      defaultAvailability = standardAvailability.availability_data
      console.log('Using standard availability for new records:', defaultAvailability)
    }

    // Create availability records for missing students
    const availabilityRecords = missingStudents.map(student => ({
      student_id: student.id,
      week_start: weekStart,
      availability_data: defaultAvailability
    }))

    console.log('Creating availability records for students:', missingStudents.map(s => s.first_name + ' ' + s.last_name))
    console.log('Week start being used:', weekStart, 'type:', typeof weekStart)
    console.log('Attempting to insert availability records:', availabilityRecords)

    console.log('Attempting to insert', availabilityRecords.length, 'availability records')
    console.log('Insert data:', JSON.stringify(availabilityRecords, null, 2))
    
    const { data: insertData, error: insertError } = await supabase
      .from('student_availability')
      .insert(availabilityRecords)
      .select()

    if (insertError) {
      console.error('Error creating student availability records:', insertError)
      console.error('Error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      })
      
      // Check if it's an RLS error
      if (insertError.message.includes('row-level security policy')) {
        console.error('RLS Policy Error detected. Current user:', user.id)
        console.error('Attempted to insert for students:', missingStudents.map(s => s.id))
        
        return NextResponse.json(
          { 
            error: 'RLS policy error: ' + insertError.message,
            details: 'The row-level security policy is preventing the insert. Please check the RLS policies.',
            hint: 'Run the production-rls-fix.sql script in Supabase SQL Editor',
            debug: {
              userId: user.id,
              instructorId: instructorId,
              studentIds: missingStudents.map(s => s.id),
              weekStart: weekStart
            }
          },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create student availability records: ' + insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          debug: {
            userId: user.id,
            instructorId: instructorId,
            studentIds: missingStudents.map(s => s.id),
            weekStart: weekStart
          }
        },
        { status: 500 }
      )
    }

    console.log('Successfully inserted records:', insertData)

    console.log('Successfully created availability records for', missingStudents.length, 'students')

    return NextResponse.json({
      success: true,
      message: `Successfully created availability records for ${missingStudents.length} students`,
      createdRecords: missingStudents.length,
      students: missingStudents.map(s => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`
      }))
    })

  } catch (error) {
    console.error('Error in create-student-availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 