import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Haal huidige gebruiker op
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Not authenticated', userError },
        { status: 401 }
      )
    }

    const userId = userData.user.id
    console.log('Testing RLS for user:', userId)

    // Test 1: Controleer tabel structuur
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'instructor_availability')
      .order('ordinal_position')

    if (tableError) {
      console.error('Table structure error:', tableError)
    }

    // Test 2: Controleer RLS policies
    let policies = null
    try {
      const { data: policiesData, error: policiesError } = await supabase
        .rpc('get_policies', { table_name: 'instructor_availability' })
      policies = policiesData
    } catch (error) {
      console.log('RPC not available, skipping policies check')
    }

    // Test 3: Probeer een test record toe te voegen
    const testData = {
      instructor_id: userId,
      week_start: '2025-01-20',
      availability_data: { maandag: ["09:00", "17:00"] },
      settings: { maxLessenPerDag: 6 }
    }

    console.log('Attempting to insert test data:', testData)

    const { data: insertData, error: insertError } = await supabase
      .from('instructor_availability')
      .insert(testData)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
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
        testData,
        tableStructure: tableInfo,
        policies: policies
      }, { status: 500 })
    }

    console.log('Insert successful:', insertData)

    // Test 4: Probeer de data op te halen
    const { data: selectData, error: selectError } = await supabase
      .from('instructor_availability')
      .select('*')
      .eq('instructor_id', userId)
      .eq('week_start', '2025-01-20')

    if (selectError) {
      console.error('Select error:', selectError)
      return NextResponse.json({
        success: false,
        error: 'Select failed',
        details: selectError,
        user: userId
      }, { status: 500 })
    }

    console.log('Select successful:', selectData)

    // Test 5: Verwijder de test data
    const { error: deleteError } = await supabase
      .from('instructor_availability')
      .delete()
      .eq('instructor_id', userId)
      .eq('week_start', '2025-01-20')

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Delete failed',
        details: deleteError,
        user: userId
      }, { status: 500 })
    }

    console.log('Delete successful')

    return NextResponse.json({
      success: true,
      message: 'All RLS tests passed',
      user: userId,
      tests: {
        insert: 'PASSED',
        select: 'PASSED',
        delete: 'PASSED'
      },
      tableStructure: tableInfo,
      policies: policies
    })

  } catch (error) {
    console.error('Test RLS error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 