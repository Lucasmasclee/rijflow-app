import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get user from request headers (you might need to implement proper auth)
    const authHeader = request.headers.get('authorization')
    
    // For now, let's just check the students table structure
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .limit(10)

    if (error) {
      return NextResponse.json(
        { error: 'Database error', details: error },
        { status: 500 }
      )
    }

    // Check the structure of the first student
    const sampleStudent = students?.[0]
    const studentStructure = sampleStudent ? {
      id: sampleStudent.id,
      first_name: sampleStudent.first_name,
      last_name: sampleStudent.last_name,
      email: sampleStudent.email,
      hasFirstName: !!sampleStudent.first_name,
      hasLastName: !!sampleStudent.last_name,
      firstNameLength: sampleStudent.first_name?.length || 0,
      lastNameLength: sampleStudent.last_name?.length || 0,
      displayName: sampleStudent.last_name ? `${sampleStudent.first_name} ${sampleStudent.last_name}` : sampleStudent.first_name,
      allFields: Object.keys(sampleStudent)
    } : null

    return NextResponse.json({
      success: true,
      totalStudents: students?.length || 0,
      sampleStudent: studentStructure,
      allStudents: students?.map(s => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        instructor_id: s.instructor_id,
        hasFirstName: !!s.first_name,
        hasLastName: !!s.last_name,
        firstNameLength: s.first_name?.length || 0,
        lastNameLength: s.last_name?.length || 0,
        displayName: s.last_name ? `${s.first_name} ${s.last_name}` : s.first_name
      }))
    })

  } catch (error) {
    console.error('Error in test-env API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 