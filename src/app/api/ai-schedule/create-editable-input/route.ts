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
      } else if (standardError && standardError.code === 'PGRST116') {
        // Geen standard_availability gevonden, gebruik default waarden
        console.log('No standard availability found, using default values')
      } else if (standardError) {
        // Andere error bij het ophalen van standard_availability
        console.error('Error fetching standard availability:', standardError)
        console.log('Using default values due to error')
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
        console.log('Using existing AI settings:', defaultSettings)
      } else if (aiSettingsError && aiSettingsError.code === 'PGRST116') {
        // Geen AI instellingen gevonden, gebruik default waarden
        console.log('No AI settings found, using default values')
      } else if (aiSettingsError) {
        // Andere error bij het ophalen van AI instellingen
        console.error('Error fetching AI settings:', aiSettingsError)
        console.log('Using default values due to error')
      } else {
        console.log('No AI settings found, using default values')
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

    // Nu de data direct opbouwen in plaats van de database functie te gebruiken
    console.log('Building AI data directly...')
    
    // Haal de instructor_availability op (nu zou deze moeten bestaan)
    const { data: instructorAvailability, error: instructorError } = await supabase
      .from('instructor_availability')
      .select('*')
      .eq('instructor_id', instructorId)
      .eq('week_start', weekStart)
      .single()

    if (instructorError) {
      console.error('Error fetching instructor availability:', instructorError)
      return NextResponse.json(
        { error: 'Failed to fetch instructor availability: ' + instructorError.message },
        { status: 500 }
      )
    }

    if (!instructorAvailability) {
      console.error('No instructor availability found after creation')
      return NextResponse.json(
        { error: 'No instructor availability found for the specified instructor and week' },
        { status: 404 }
      )
    }

    // Haal leerlingen op
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('instructor_id', instructorId)
      .order('first_name', { ascending: true })

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch students: ' + studentsError.message },
        { status: 500 }
      )
    }

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: 'No students found for this instructor. Please add students first.' },
        { status: 404 }
      )
    }

    // Haal student availability op
    let { data: studentAvailability, error: studentAvailError } = await supabase
      .from('student_availability')
      .select('*')
      .in('student_id', students.map(s => s.id))
      .eq('week_start', weekStart)

    if (studentAvailError) {
      console.error('Error fetching student availability:', studentAvailError)
      // Continue without student availability
    }

    // Automatisch student availability records aanmaken voor studenten die er nog geen hebben
    if (students && students.length > 0) {
      const existingStudentIds = studentAvailability?.map(sa => sa.student_id) || []
      const missingStudentIds = students.filter(s => !existingStudentIds.includes(s.id)).map(s => s.id)
      
      if (missingStudentIds.length > 0) {
        console.log('Creating missing student availability records for students:', missingStudentIds)
        
        // Haal standaard beschikbaarheid op voor studenten
        const { data: standardStudentAvailability, error: standardStudentError } = await supabase
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
        if (standardStudentAvailability && !standardStudentError && standardStudentAvailability.availability_data) {
          defaultStudentAvailability = standardStudentAvailability.availability_data
          console.log('Using standard availability for students:', defaultStudentAvailability)
        }

        // Maak records aan voor ontbrekende studenten
        const studentAvailabilityRecords = missingStudentIds.map(studentId => ({
          student_id: studentId,
          week_start: weekStart,
          availability_data: defaultStudentAvailability
        }))

        const { error: insertStudentError } = await supabase
          .from('student_availability')
          .insert(studentAvailabilityRecords)

        if (insertStudentError) {
          console.error('Error creating student availability records:', insertStudentError)
          // Continue even if student availability creation fails
        } else {
          console.log('Successfully created student availability records for', missingStudentIds.length, 'students')
        }

        // Haal de bijgewerkte student availability op
        const { data: updatedStudentAvailability, error: updatedStudentAvailError } = await supabase
          .from('student_availability')
          .select('*')
          .in('student_id', students.map(s => s.id))
          .eq('week_start', weekStart)

        if (!updatedStudentAvailError) {
          // Update de studentAvailability variabele met de nieuwe data
          const existingRecords = studentAvailability || []
          const newRecords = updatedStudentAvailability?.filter(sa => 
            !existingRecords.some(existing => existing.student_id === sa.student_id)
          ) || []
          studentAvailability = [...existingRecords, ...newRecords]
        }
      }
    }

    // Genereer week datums
    const weekDates = []
    const weekStartDate = new Date(weekStart)
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate)
      date.setDate(weekStartDate.getDate() + i)
      weekDates.push(date.toISOString().split('T')[0])
    }

    // Bouw instructor data
    const instructorData = {
      beschikbareUren: instructorAvailability.availability_data || {},
      datums: weekDates,
      maxLessenPerDag: instructorAvailability.settings?.maxLessenPerDag || 6,
      blokuren: instructorAvailability.settings?.blokuren ?? true,
      pauzeTussenLessen: instructorAvailability.settings?.pauzeTussenLessen || 10,
      langePauzeDuur: instructorAvailability.settings?.langePauzeDuur || 0,
      locatiesKoppelen: instructorAvailability.settings?.locatiesKoppelen ?? true
    }

    // Bouw students data
    const studentsData = students.map(student => {
      const studentAvail = studentAvailability?.find(sa => sa.student_id === student.id)
      return {
        id: student.id,
        naam: student.last_name ? `${student.first_name} ${student.last_name}` : student.first_name,
        lessenPerWeek: student.default_lessons_per_week || 2,
        lesDuur: student.default_lesson_duration_minutes || 60,
        beschikbaarheid: studentAvail?.availability_data || {}
      }
    })

    // Combineer data
    const aiData = {
      instructeur: instructorData,
      leerlingen: studentsData
    }

    console.log('Successfully built AI data:', {
      instructor: instructorData,
      studentsCount: studentsData.length
    })

    console.log('Successfully created editable input with data:', {
      instructor: aiData.instructeur,
      studentsCount: aiData.leerlingen.length
    })

    // Determine the source of instructor availability data
    let availabilitySource: 'existing' | 'standard' | 'default' = 'default'
    if (existingAvailability) {
      availabilitySource = 'existing'
    } else if (standardAvailability && !standardError && standardAvailability.availability_data) {
      availabilitySource = 'standard'
    }

    return NextResponse.json({
      success: true,
      data: aiData,
      availabilitySource: availabilitySource,
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