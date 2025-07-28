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

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch students: ' + studentsError.message },
        { status: 500 }
      )
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        debugInfo: {
          totalStudents: 0,
          missingStudents: 0,
          missingStudentsDetails: [],
          message: 'No students found for this instructor'
        }
      })
    }

    // Get existing student availability records for this week
    const { data: existingAvailability, error: existingError } = await supabase
      .from('student_availability')
      .select('student_id')
      .in('student_id', students.map(s => s.id))
      .eq('week_start', weekStart)

    if (existingError) {
      console.error('Error fetching existing student availability:', existingError)
      return NextResponse.json(
        { error: 'Failed to fetch existing student availability: ' + existingError.message },
        { status: 500 }
      )
    }

    // Find students that don't have availability records for this week
    const existingStudentIds = existingAvailability?.map(sa => sa.student_id) || []
    const missingStudents = students.filter(student => !existingStudentIds.includes(student.id))

    const debugInfo = {
      totalStudents: students.length,
      missingStudents: missingStudents.length,
      missingStudentsDetails: missingStudents.map(s => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name || ''}`.trim()
      })),
      existingRecords: existingStudentIds.length,
      weekStart: weekStart,
      instructorId: instructorId
    }

    console.log('Debug info:', debugInfo)

    return NextResponse.json({
      debugInfo: debugInfo
    })

  } catch (error) {
    console.error('Error in debug-student-availability:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
} 