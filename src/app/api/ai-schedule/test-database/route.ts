import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
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

    console.log('Testing database connection for user:', user.id)

    // Test 1: Check if we can read from students table
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, first_name, last_name, instructor_id')
      .eq('instructor_id', user.id)
      .limit(5)

    // Test 2: Check if we can read from student_availability table
    const { data: availability, error: availabilityError } = await supabase
      .from('student_availability')
      .select('*')
      .limit(5)

    // Test 3: Try to insert a test record (will be rolled back)
    let insertTest = { success: false, error: null as string | null }
    if (students && students.length > 0) {
      const testWeekStart = new Date()
      testWeekStart.setDate(testWeekStart.getDate() + 7) // Next week
      const testWeekStartString = testWeekStart.toISOString().split('T')[0]

      const testRecord = {
        student_id: students[0].id,
        week_start: testWeekStartString,
        availability_data: {
          maandag: ["09:00", "17:00"],
          dinsdag: ["09:00", "17:00"]
        }
      }

      const { error: insertError } = await supabase
        .from('student_availability')
        .insert(testRecord)

      insertTest = {
        success: !insertError,
        error: insertError ? insertError.message : null
      }

      // Clean up test record if it was inserted
      if (!insertError) {
        await supabase
          .from('student_availability')
          .delete()
          .eq('student_id', students[0].id)
          .eq('week_start', testWeekStartString)
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      database_tests: {
        students_read: {
          success: !studentsError,
          count: students?.length || 0,
          error: studentsError ? 'Error reading students' : null
        },
        availability_read: {
          success: !availabilityError,
          count: availability?.length || 0,
          error: availabilityError ? 'Error reading availability' : null
        },
        insert_test: insertTest
      },
      summary: {
        can_read_students: !studentsError,
        can_read_availability: !availabilityError,
        can_insert_availability: insertTest.success,
        total_students: students?.length || 0,
        total_availability_records: availability?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in test-database:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 