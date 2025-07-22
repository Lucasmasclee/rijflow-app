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

    // Als er geen bestaande beschikbaarheid is, maak een nieuwe aan met standaardwaarden
    if (!existingAvailability) {
      console.log('No existing availability found, creating new availability with default values')
      
      // Standaard beschikbaarheid voor werkdagen (maandag-vrijdag)
      const availabilityData = {
        maandag: ["09:00", "17:00"],
        dinsdag: ["09:00", "17:00"],
        woensdag: ["09:00", "17:00"],
        donderdag: ["09:00", "17:00"],
        vrijdag: ["09:00", "17:00"]
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

      const { error: insertError } = await supabase
        .from('instructor_availability')
        .insert({
          instructor_id: instructorId,
          week_start: weekStart,
          availability_data: availabilityData,
          settings: defaultSettings
        })

      if (insertError) {
        console.error('Error creating new availability:', insertError)
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

    if (!aiData || !aiData.instructeur || !aiData.leerlingen) {
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