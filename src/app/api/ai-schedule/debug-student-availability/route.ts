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

    console.log('Debugging student availability for instructor:', instructorId, 'week:', weekStart)

    // Get all students for this instructor
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('instructor_id', instructorId)

    console.log('Found students for instructor:', students?.map(s => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`
    })))

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch students: ' + studentsError.message },
        { status: 500 }
      )
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        message: 'No students found for this instructor',
        students: [],
        studentAvailability: [],
        missingStudents: []
      })
    }

    // Get existing student availability records
    console.log('Searching for student availability with week_start:', weekStart, 'type:', typeof weekStart)
    console.log('Student IDs to search for:', students.map(s => s.id))
    
    const { data: studentAvailability, error: availabilityError } = await supabase
      .from('student_availability')
      .select('student_id, availability_data, week_start')
      .in('student_id', students.map(s => s.id))
      .eq('week_start', weekStart)

    if (availabilityError) {
      console.error('Error fetching student availability:', availabilityError)
      return NextResponse.json(
        { error: 'Failed to fetch student availability: ' + availabilityError.message },
        { status: 500 }
      )
    }

    // Find missing students
    const existingStudentIds = studentAvailability?.map(sa => sa.student_id) || []
    const missingStudents = students.filter(s => !existingStudentIds.includes(s.id))

    // Get ALL student availability records for this instructor (for debugging)
    const { data: allStudentAvailability, error: allAvailabilityError } = await supabase
      .from('student_availability')
      .select('student_id, week_start, availability_data')
      .in('student_id', students.map(s => s.id))
      .order('week_start', { ascending: true })

    if (allAvailabilityError) {
      console.error('Error fetching all student availability:', allAvailabilityError)
    }

    // Also check if there are ANY student_availability records for this week (regardless of student_id)
    const { data: anyAvailabilityForWeek, error: anyAvailabilityError } = await supabase
      .from('student_availability')
      .select('student_id, week_start, availability_data')
      .eq('week_start', weekStart)

    if (anyAvailabilityError) {
      console.error('Error fetching any availability for week:', anyAvailabilityError)
    } else {
      console.log('ANY availability records for week', weekStart, ':', anyAvailabilityForWeek?.length || 0)
      console.log('Records:', anyAvailabilityForWeek)
    }

    const debugInfo = {
      weekStart,
      instructorId,
      totalStudents: students.length,
      studentsWithAvailability: existingStudentIds.length,
      missingStudents: missingStudents.length,
      students: students.map(s => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        hasAvailability: existingStudentIds.includes(s.id)
      })),
      studentAvailability: studentAvailability || [],
      missingStudentsDetails: missingStudents.map(s => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`
      })),
      // Add more debug information
      searchQuery: {
        weekStart,
        weekStartType: typeof weekStart,
        studentIds: students.map(s => s.id)
      },
      allStudentAvailability: studentAvailability || [],
      allStudentAvailabilityRecords: allStudentAvailability || [],
      anyAvailabilityForWeek: anyAvailabilityForWeek || []
    }

    console.log('Debug info:', debugInfo)

    return NextResponse.json({
      success: true,
      debugInfo
    })

  } catch (error) {
    console.error('Error in debug-student-availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 