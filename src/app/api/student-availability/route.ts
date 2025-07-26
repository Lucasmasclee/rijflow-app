import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('weekStart')
    const instructorId = searchParams.get('instructorId')

    if (!weekStart || !instructorId) {
      return NextResponse.json(
        { error: 'weekStart and instructorId are required' },
        { status: 400 }
      )
    }

    // Get all students for this instructor with their availability for the specified week
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        first_name,
        last_name,
        default_lessons_per_week,
        default_lesson_duration_minutes,
        student_availability!inner(
          availability_data
        )
      `)
      .eq('instructor_id', instructorId)
      .eq('student_availability.week_start', weekStart)

    if (studentsError) {
      console.error('Error fetching students with availability:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch student availability' },
        { status: 500 }
      )
    }

    // Format the data for the AI schedule
    const formattedStudents = (students || []).map(student => ({
      id: student.id,
      naam: student.last_name 
        ? `${student.first_name} ${student.last_name}`
        : student.first_name,
      lessenPerWeek: student.default_lessons_per_week || 2,
      lesDuur: student.default_lesson_duration_minutes || 60,
      beschikbaarheid: student.student_availability?.[0]?.availability_data || {}
    }))

    return NextResponse.json({
      success: true,
      students: formattedStudents
    })

  } catch (error) {
    console.error('Error in student availability route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 