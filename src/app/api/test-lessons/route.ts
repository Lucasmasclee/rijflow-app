import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Check if lessons table exists and get its structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('lessons')
      .select('*')
      .limit(1)

    if (tableError) {
      return NextResponse.json(
        { error: 'Lessons table error', details: tableError },
        { status: 500 }
      )
    }

    // Get sample data to understand structure
    const { data: sampleLessons, error: sampleError } = await supabase
      .from('lessons')
      .select('*')
      .limit(5)

    if (sampleError) {
      return NextResponse.json(
        { error: 'Sample lessons error', details: sampleError },
        { status: 500 }
      )
    }

    // Test inserting a single lesson
    const testLesson = {
      date: '2025-01-20',
      start_time: '09:00:00',
      end_time: '10:00:00',
      student_id: '00000000-0000-0000-0000-000000000000', // Dummy ID
      instructor_id: '00000000-0000-0000-0000-000000000000', // Dummy ID
      status: 'scheduled',
      notes: 'Test lesson'
    }

    const { data: insertTest, error: insertError } = await supabase
      .from('lessons')
      .insert([testLesson])
      .select()

    return NextResponse.json({
      success: true,
      tableExists: true,
      sampleLessons: sampleLessons?.length || 0,
      tableStructure: tableInfo ? Object.keys(tableInfo[0] || {}) : [],
      insertTest: insertError ? { error: insertError } : { success: true, data: insertTest }
    })

  } catch (error) {
    console.error('Error in test-lessons API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 