import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { weekStart } = await request.json()

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
    
    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const instructorId = user.id // Always use the current user's ID

    console.log('Creating editable input for instructor:', instructorId, 'week:', weekStart)
    console.log('Current user:', user.id)

    // Eerst controleren of er al beschikbaarheid bestaat voor deze instructeur en week
    const { data: existingAvailability, error: checkError } = await supabase
      .from('instructor_availability')
      .select('*')
      .eq('instructor_id', instructorId)
      .eq('week_start', weekStart)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing availability:', checkError)
      return NextResponse.json(
        { error: 'Failed to check existing availability: ' + checkError.message },
        { status: 500 }
      )
    }

    // Als er geen bestaande beschikbaarheid is, haal eerst de standaard beschikbaarheid op
    if (!existingAvailability) {
      console.log('No existing availability found, checking standard availability')
      
      // Haal standaard beschikbaarheid op
      const { data: standardAvailability, error: standardError } = await supabase
        .from('standard_availability')
        .select('availability_data')
        .eq('instructor_id', instructorId)
        .single()

      let availabilityData = {
        maandag: ["09:00", "17:00"],
        dinsdag: ["09:00", "17:00"],
        woensdag: ["09:00", "17:00"],
        donderdag: ["09:00", "17:00"],
        vrijdag: ["09:00", "17:00"]
      }

      // Gebruik standaard beschikbaarheid als deze bestaat
      if (standardAvailability && !standardError && standardAvailability.availability_data) {
        availabilityData = standardAvailability.availability_data
        console.log('Using standard availability:', availabilityData)
      } else {
        console.log('No standard availability found, using default values')
      }

      // Haal AI instellingen op uit instructor_ai_settings tabel
      const { data: aiSettings, error: aiSettingsError } = await supabase
        .from('instructor_ai_settings')
        .select('*')
        .eq('instructor_id', instructorId)
        .single()

      let defaultSettings = {
        maxLessenPerDag: 6,
        blokuren: true,
        pauzeTussenLessen: 10,
        langePauzeDuur: 0,
        locatiesKoppelen: true
      }

      // Gebruik bestaande AI instellingen als ze bestaan
      if (aiSettings && !aiSettingsError) {
        defaultSettings = {
          maxLessenPerDag: 6,
          blokuren: aiSettings.blokuren ?? true,
          pauzeTussenLessen: aiSettings.pauze_tussen_lessen ?? 10,
          langePauzeDuur: aiSettings.lange_pauze_duur ?? 0,
          locatiesKoppelen: aiSettings.locaties_koppelen ?? true
        }
      }

      // Debug: Log de data die we proberen in te voegen
      const insertData = {
        instructor_id: instructorId,
        week_start: weekStart,
        availability_data: availabilityData,
        settings: defaultSettings
      }
      console.log('Attempting to insert data:', JSON.stringify(insertData, null, 2))

      const { error: insertError } = await supabase
        .from('instructor_availability')
        .insert(insertData)

      if (insertError) {
        console.error('Error creating new availability:', insertError)
        console.error('Error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        })
        return NextResponse.json(
          { error: 'Failed to create new availability: ' + insertError.message },
          { status: 500 }
        )
      }

      console.log('Successfully created new availability with default values')
    }

    // Nu de data ophalen (nu zou er data moeten zijn)
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

    // Debug: Log de data die we krijgen
    console.log('AI data received:', aiData)

    if (!aiData || !aiData.instructeur || !aiData.leerlingen) {
      console.error('No valid AI data found:', aiData)
      return NextResponse.json(
        { error: 'No data found for the specified instructor and week' },
        { status: 404 }
      )
    }

    // Controleer of er leerlingen zijn
    if (!aiData.leerlingen || aiData.leerlingen.length === 0) {
      return NextResponse.json(
        { error: 'No students found for this instructor. Please add students first.' },
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
      message: existingAvailability ? 'Editable input created successfully' : 'New availability created with default values and editable input loaded successfully'
    })

  } catch (error) {
    console.error('Error in create-editable-input:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 