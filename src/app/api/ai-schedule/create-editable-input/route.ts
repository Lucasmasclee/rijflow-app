import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { instructorId, weekStart } = await request.json()

    if (!instructorId || !weekStart) {
      return NextResponse.json(
        { error: 'Missing required parameters: instructorId and weekStart' },
        { status: 400 }
      )
    }

    console.log('Creating editable input for instructor:', instructorId, 'week:', weekStart)

    // Gebruik de nieuwe helper functie om data op te halen
    const { data: aiData, error: aiError } = await supabase
      .rpc('get_ai_weekplanning_data', {
        p_instructor_id: instructorId,
        p_week_start: weekStart
      })

    if (aiError) {
      console.error('Error fetching AI weekplanning data:', aiError)
      return NextResponse.json(
        { error: 'Failed to fetch AI weekplanning data: ' + aiError.message },
        { status: 500 }
      )
    }

    if (!aiData || !aiData.instructeur || !aiData.leerlingen) {
      return NextResponse.json(
        { error: 'No data found for the specified instructor and week' },
        { status: 404 }
      )
    }

    // Controleer of er leerlingen zijn
    if (!aiData.leerlingen || aiData.leerlingen.length === 0) {
      return NextResponse.json(
        { error: 'No students found for this instructor' },
        { status: 404 }
      )
    }

    console.log('Successfully created editable input with data:', {
      instructor: aiData.instructeur,
      studentsCount: aiData.leerlingen.length
    })

    return NextResponse.json({
      success: true,
      data: aiData,
      message: 'Editable input created successfully'
    })

  } catch (error) {
    console.error('Error in create-editable-input:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 