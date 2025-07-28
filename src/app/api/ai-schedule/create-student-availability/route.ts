import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    console.log('Creating student availability for instructor:', instructorId, 'week:', weekStart)

    // Get all students for this instructor
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('instructor_id', instructorId)

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

    // Get existing student availability records for this week
    const { data: existingAvailability, error: existingError } = await supabase
      .from('student_availability')
      .select('student_id')
      .in('student_id', students.map((s: any) => s.id))
      .eq('week_start', weekStart)

    if (existingError) {
      console.error('Error fetching existing student availability:', existingError)
      return NextResponse.json(
        { error: 'Failed to fetch existing student availability: ' + existingError.message },
        { status: 500 }
      )
    }

    // Find students that don't have availability records for this week
    const existingStudentIds = existingAvailability?.map((sa: any) => sa.student_id) || []
    const missingStudentIds = students
      .map((s: any) => s.id)
      .filter((id: any) => !existingStudentIds.includes(id))

    console.log('Missing student availability records for students:', missingStudentIds)

    if (missingStudentIds.length === 0) {
      return NextResponse.json({
        message: 'All students already have availability records for this week',
        createdRecords: 0
      })
    }

    // Create availability records for missing students
    const recordsToCreate = missingStudentIds.map((studentId: any) => ({
      student_id: studentId,
      week_start: weekStart,
      availability_data: {} // Empty availability data, will be filled by user
    }))

    const { error: createError } = await supabase
      .from('student_availability')
      .insert(recordsToCreate)

    if (createError) {
      console.error('Error creating student availability records:', createError)
      return NextResponse.json(
        { error: 'Failed to create student availability records: ' + createError.message },
        { status: 500 }
      )
    }

    console.log('Successfully created', missingStudentIds.length, 'student availability records')

    return NextResponse.json({
      message: `Created ${missingStudentIds.length} student availability records`,
      createdRecords: missingStudentIds.length,
      studentIds: missingStudentIds
    })

  } catch (error) {
    console.error('Error in create-student-availability:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
} 