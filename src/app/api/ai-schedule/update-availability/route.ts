import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { instructorId, weekStart, instructorAvailability, studentAvailability } = await request.json()

    if (!instructorId || !weekStart) {
      return NextResponse.json(
        { error: 'Missing required parameters: instructorId and weekStart' },
        { status: 400 }
      )
    }

    console.log('Updating availability for instructor:', instructorId, 'week:', weekStart)

    // Update instructor availability
    if (instructorAvailability) {
      const { error: instructorError } = await supabase
        .from('instructor_availability')
        .upsert({
          instructor_id: instructorId,
          week_start: weekStart,
          availability_data: instructorAvailability.availability_data || {},
          settings: instructorAvailability.settings || {}
        }, {
          onConflict: 'instructor_id,week_start'
        })

      if (instructorError) {
        console.error('Error updating instructor availability:', instructorError)
        return NextResponse.json(
          { error: 'Failed to update instructor availability: ' + instructorError.message },
          { status: 500 }
        )
      }
    }

    // Update student availability
    if (studentAvailability && Array.isArray(studentAvailability)) {
      for (const student of studentAvailability) {
        if (student.id && student.availability_data) {
          const { error: studentError } = await supabase
            .from('student_availability')
            .upsert({
              student_id: student.id,
              week_start: weekStart,
              availability_data: student.availability_data
            }, {
              onConflict: 'student_id,week_start'
            })

          if (studentError) {
            console.error('Error updating student availability for student:', student.id, studentError)
            // Continue with other students even if one fails
          }
        }
      }
    }

    console.log('Successfully updated availability data')

    return NextResponse.json({
      success: true,
      message: 'Availability updated successfully'
    })

  } catch (error) {
    console.error('Error in update-availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 