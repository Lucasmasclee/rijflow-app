import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      pauzeTussenLessen, 
      langePauzeDuur, 
      locatiesKoppelen, 
      blokuren 
    } = body

    // Prepare update data
    const updateData: any = {}
    if (pauzeTussenLessen !== undefined) {
      updateData.pauze_tussen_lessen = pauzeTussenLessen
    }
    if (langePauzeDuur !== undefined) {
      updateData.lange_pauze_duur = langePauzeDuur
    }
    if (locatiesKoppelen !== undefined) {
      updateData.locaties_koppelen = locatiesKoppelen
    }
    if (blokuren !== undefined) {
      updateData.blokuren = blokuren
    }

    // Update or insert AI settings
    const { data, error } = await supabase
      .from('instructor_ai_settings')
      .upsert({
        instructor_id: user.id,
        ...updateData
      }, {
        onConflict: 'instructor_id',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('Error updating AI settings:', error)
      return NextResponse.json({ 
        error: 'Failed to update AI settings',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'AI settings updated successfully',
      data: data?.[0] || null
    })

  } catch (error) {
    console.error('Error updating AI settings:', error)
    return NextResponse.json({ 
      error: 'Failed to update AI settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get AI settings for the instructor
    const { data, error } = await supabase
      .from('instructor_ai_settings')
      .select('*')
      .eq('instructor_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching AI settings:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch AI settings',
        details: error.message
      }, { status: 500 })
    }

    // Return default settings if no record exists
    const defaultSettings = {
      pauze_tussen_lessen: 5,
      lange_pauze_duur: 0,
      locaties_koppelen: true,
      blokuren: true
    }

    return NextResponse.json({ 
      success: true, 
      data: data || defaultSettings
    })

  } catch (error) {
    console.error('Error fetching AI settings:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch AI settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 