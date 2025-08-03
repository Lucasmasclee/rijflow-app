import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { weekStart, instructorAvailability, studentAvailability } = await request.json()

    if (!weekStart) {
      return NextResponse.json(
        { error: 'Missing required parameter: weekStart' },
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

    const instructorId = user.id // Always use the current user's ID

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

    // ALTIJD student availability records aanmaken voor ontbrekende studenten
    // Dit gebeurt ongeacht of er studentAvailability data wordt meegestuurd
    const { data: allStudents, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('instructor_id', instructorId)

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
    } else if (allStudents) {
      // Controleer welke studenten nog geen availability record hebben voor deze week
      const { data: existingStudentAvailability, error: existingError } = await supabase
        .from('student_availability')
        .select('student_id')
        .in('student_id', allStudents.map(s => s.id))
        .eq('week_start', weekStart)

      if (existingError) {
        console.error('Error checking existing student availability:', existingError)
      } else {
        const existingStudentIds = existingStudentAvailability?.map(sa => sa.student_id) || []
        const missingStudentIds = allStudents
          .filter(s => !existingStudentIds.includes(s.id))
          .map(s => s.id)

        // Maak ontbrekende student availability records aan
        if (missingStudentIds.length > 0) {
          console.log('Creating missing student availability records for students:', missingStudentIds)
          
          // Haal standaard beschikbaarheid op
          const { data: standardAvailability, error: standardError } = await supabase
            .from('standard_availability')
            .select('availability_data')
            .eq('instructor_id', instructorId)
            .single()

          let defaultStudentAvailability = {
            maandag: ["09:00", "17:00"],
            dinsdag: ["09:00", "17:00"],
            woensdag: ["09:00", "17:00"],
            donderdag: ["09:00", "17:00"],
            vrijdag: ["09:00", "17:00"]
          }

          // Gebruik standaard beschikbaarheid als deze bestaat
          if (standardAvailability && !standardError && standardAvailability.availability_data) {
            // Parse standard availability data if it's a string
            let standardAvailabilityData = standardAvailability.availability_data
            if (typeof standardAvailability.availability_data === 'string') {
              try {
                standardAvailabilityData = JSON.parse(standardAvailability.availability_data)
              } catch (parseError) {
                console.error('Error parsing standard availability_data as JSON:', parseError)
                standardAvailabilityData = defaultStudentAvailability
              }
            }
            defaultStudentAvailability = standardAvailabilityData
            console.log('Using standard availability for students:', defaultStudentAvailability)
          }

          // Maak records aan voor ontbrekende studenten
          const studentAvailabilityRecords = missingStudentIds.map(studentId => ({
            student_id: studentId,
            week_start: weekStart,
            availability_data: defaultStudentAvailability
          }))

          const { error: insertError } = await supabase
            .from('student_availability')
            .insert(studentAvailabilityRecords)

          if (insertError) {
            console.error('Error creating missing student availability records:', insertError)
          } else {
            console.log('Successfully created student availability records for', missingStudentIds.length, 'students')
          }
        } else {
          console.log('All students already have availability records for this week')
        }
      }
    }

    // Update student availability als er data wordt meegestuurd
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
          } else {
            console.log('Successfully updated availability for student:', student.id)
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