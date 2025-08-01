import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Student, StudentAvailability } from '@/types/database'
import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import path from 'path'

// Helper function to parse time string to minutes
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// Helper function to format minutes to time string
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// Helper function to get next week dates
function getNextWeekDates(): string[] {
  const today = new Date()
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7) // Next Monday
  
  const weekDates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(nextMonday)
    date.setDate(nextMonday.getDate() + i)
    weekDates.push(date.toISOString().split('T')[0])
  }
  return weekDates
}



// Main scheduling function using generate_week_planning.js
async function generateSchedule(instructor: any, students: any[], weekDates: string[]): Promise<any> {
  try {
    // Create temporary input file for the script
    const sampleInputData = {
      instructeur: instructor,
      leerlingen: students
    }
    
    const tempInputPath = path.join(process.cwd(), 'temp_sample_input.json')
    writeFileSync(tempInputPath, JSON.stringify(sampleInputData, null, 2))
    
    // Get the path to the generate_week_planning.js script
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_week_planning.js')
    
    // Run the generate_week_planning.js script
    return new Promise((resolve, reject) => {
      const child = spawn('node', [scriptPath, tempInputPath], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      let stdout = ''
      let stderr = ''
      
      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })
      
      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })
      
      child.on('close', (code) => {
        // Clean up temporary file
        try {
          unlinkSync(tempInputPath)
        } catch (error) {
          console.error('Error deleting temporary file:', error)
        }
        
        if (code !== 0) {
          console.error('Script stderr:', stderr)
          reject(new Error(`Script failed with code ${code}: ${stderr}`))
          return
        }
        
        try {
          const result = JSON.parse(stdout)
          resolve(result)
        } catch (error) {
          console.error('Error parsing script output:', error)
          console.error('Script stdout:', stdout)
          reject(new Error('Failed to parse script output'))
        }
      })
      
      child.on('error', (error) => {
        // Clean up temporary file
        try {
          unlinkSync(tempInputPath)
        } catch (cleanupError) {
          console.error('Error deleting temporary file:', cleanupError)
        }
        
        reject(error)
      })
    })
  } catch (error) {
    console.error('Error in generateSchedule:', error)
    throw error
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    console.log('Authenticated user:', user.id)

    // Get AI settings for the current user
    const { data: aiSettings, error: settingsError } = await supabase
      .from('instructor_ai_settings')
      .select('*')
      .eq('instructor_id', user.id)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching AI settings:', settingsError)
      return NextResponse.json({ 
        error: 'Failed to fetch AI settings',
        details: settingsError.message
      }, { status: 500 })
    }

    // Use default settings if none exist
    const settings = aiSettings || {
      pauze_tussen_lessen: 5,
      lange_pauze_duur: 0,
      locaties_koppelen: true,
      blokuren: true
    }

    // Get instructor availability
    const { data: instructorAvailability, error: availabilityError } = await supabase
      .from('instructor_availability')
      .select('*')
      .eq('instructor_id', user.id)

    if (availabilityError) {
      console.error('Error fetching instructor availability:', availabilityError)
      return NextResponse.json({ 
        error: 'Failed to fetch instructor availability',
        details: availabilityError.message
      }, { status: 500 })
    }

    // Get students
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('instructor_id', user.id)
      .order('first_name', { ascending: true })

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json({ 
        error: 'Failed to fetch students',
        details: studentsError.message
      }, { status: 500 })
    }

    if (!studentsData || studentsData.length === 0) {
      return NextResponse.json({ 
        error: 'No students found',
        details: 'Please add students before generating a schedule'
      }, { status: 400 })
    }

    // Get student availability for the current week
    const weekDates = getNextWeekDates()
    const currentWeekStart = weekDates[0]
    
    const { data: studentAvailability, error: studentAvailError } = await supabase
      .from('student_availability')
      .select('*')
      .in('student_id', studentsData.map(s => s.id))
      .eq('week_start', currentWeekStart)

    if (studentAvailError) {
      console.error('Error fetching student availability:', studentAvailError)
    }

    // Build instructor data structure
    const instructor = {
      beschikbareUren: {} as { [key: string]: string[] },
      datums: weekDates,
      maxLessenPerDag: 6,
      blokuren: settings.blokuren,
      pauzeTussenLessen: settings.pauze_tussen_lessen,
      langePauzeDuur: settings.lange_pauze_duur,
      locatiesKoppelen: settings.locaties_koppelen
    }

    // Map instructor availability - only include available days
    const dayNames = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
    instructorAvailability?.forEach(avail => {
      const dayName = dayNames[avail.day_of_week]
      if (avail.available) {
        // Format time to HH:MM format (remove seconds)
        const startTime = avail.start_time.split(':').slice(0, 2).join(':')
        const endTime = avail.end_time.split(':').slice(0, 2).join(':')
        instructor.beschikbareUren[dayName] = [startTime, endTime]
      }
      // Note: Unavailable days are simply not included in beschikbareUren
    })

    // Build students data structure
    const students = studentsData.map(student => {
      // Get availability for this student
      const studentAvail = studentAvailability?.find(sa => sa.student_id === student.id)
      
      // Use structured availability data if available, otherwise parse text
      const beschikbaarheid: { [key: string]: string[] } = {}
      
      // Map day names from English to Dutch
      const dayMapping: { [key: string]: string } = {
        'monday': 'maandag',
        'tuesday': 'dinsdag',
        'wednesday': 'woensdag',
        'thursday': 'donderdag',
        'friday': 'vrijdag',
        'saturday': 'zaterdag',
        'sunday': 'zondag'
      }
      
      // If we have structured availability data, use it
      if (student.availability && Array.isArray(student.availability)) {
        student.availability.forEach((day: any) => {
          if (day.available && dayMapping[day.day]) {
            const dutchDay = dayMapping[day.day]
            // Format time to HH:MM format (remove seconds)
            const startTime = day.startTime.split(':').slice(0, 2).join(':')
            const endTime = day.endTime.split(':').slice(0, 2).join(':')
            beschikbaarheid[dutchDay] = [startTime, endTime]
          }
        })
      }
      
      // If no structured data available, fall back to parsing text
      if (Object.keys(beschikbaarheid).length === 0) {
        const availabilityText = studentAvail?.notes || 'Flexibel beschikbaar'
        const dayNames = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
        
        // Look for patterns like "Maandag: 09:00 - 17:00"
        dayNames.forEach(day => {
          const dayName = day === 'maandag' ? 'Maandag' :
                         day === 'dinsdag' ? 'Dinsdag' :
                         day === 'woensdag' ? 'Woensdag' :
                         day === 'donderdag' ? 'Donderdag' :
                         day === 'vrijdag' ? 'Vrijdag' :
                         day === 'zaterdag' ? 'Zaterdag' : 'Zondag'
          
          const dayPattern = new RegExp(`${dayName}:\\s*([^,]+)`, 'i')
          const match = availabilityText.match(dayPattern)
          
          if (match) {
            const timeText = match[1].trim()
            const timeRangeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?/)
            
            if (timeRangeMatch) {
              const startHour = timeRangeMatch[1].padStart(2, '0')
              const startMinute = timeRangeMatch[2] || '00'
              const endHour = timeRangeMatch[3].padStart(2, '0')
              const endMinute = timeRangeMatch[4] || '00'
              
              beschikbaarheid[day] = [`${startHour}:${startMinute}`, `${endHour}:${endMinute}`]
            }
          }
        })
        
        // If no specific times found, check for simple day mentions
        if (Object.keys(beschikbaarheid).length === 0) {
          const lowerText = availabilityText.toLowerCase()
          for (const [english, dutch] of Object.entries(dayMapping)) {
            if (lowerText.includes(english) || lowerText.includes(dutch)) {
              // Assume 9:00-17:00 availability for mentioned days
              beschikbaarheid[dutch] = ['09:00', '17:00']
            }
          }
        }
        
        // If still no specific days mentioned, assume flexible availability
        if (Object.keys(beschikbaarheid).length === 0) {
          dayNames.forEach(day => {
            if (day !== 'zondag') { // Skip Sunday by default
              beschikbaarheid[day] = ['09:00', '17:00']
            }
          })
        }
      }
      
      return {
        id: student.id,
        naam: student.last_name ? `${student.first_name} ${student.last_name}` : student.first_name,
        lessenPerWeek: student.default_lessons_per_week || 2,
        lesDuur: student.default_lesson_duration_minutes || 60,
        beschikbaarheid: beschikbaarheid
      }
    })

    // Create the complete sample_input.json structure and log it
    const sampleInputData = {
      instructeur: instructor,
      leerlingen: students
    }
    
    console.log('=== SAMPLE_INPUT.JSON DATA ===')
    console.log(JSON.stringify(sampleInputData, null, 2))
    console.log('=== END SAMPLE_INPUT.JSON DATA ===')

    // Generate schedule using the generate_week_planning.js script
    const result = await generateSchedule(instructor, students, weekDates)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error in test route:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 