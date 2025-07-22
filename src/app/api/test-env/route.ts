import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test 1: Controleer authenticatie
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Not authenticated', userError },
        { status: 401 }
      )
    }

    const userId = userData.user.id

    // Test 2: Controleer tabel structuur
    const { data: tableStructure, error: tableError } = await supabase
      .from('instructor_availability')
      .select('*')
      .limit(0)

    // Test 3: Probeer een test insert
    const testData = {
      instructor_id: userId,
      week_start: '2025-01-20',
      availability_data: { maandag: ["09:00", "17:00"] },
      settings: { maxLessenPerDag: 6 }
    }

    const { data: insertData, error: insertError } = await supabase
      .from('instructor_availability')
      .insert(testData)
      .select()

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: 'Insert failed',
        details: {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        },
        user: userId,
        testData
      }, { status: 500 })
    }

    // Test 4: Verwijder test data
    await supabase
      .from('instructor_availability')
      .delete()
      .eq('instructor_id', userId)
      .eq('week_start', '2025-01-20')

    return NextResponse.json({
      success: true,
      message: 'RLS test passed',
      user: userId,
      tableStructure: tableStructure ? 'Table exists' : 'Table error',
      insertTest: 'PASSED'
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 