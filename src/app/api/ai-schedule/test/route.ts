import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Student, StudentAvailability } from '@/types/database'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

// Helper function to check if student is available on a specific day and time
function isStudentAvailable(student: any, day: string, startTime: number, endTime: number): boolean {
  if (!student.beschikbaarheid || !student.beschikbaarheid[day]) {
    return false
  }
  
  const studentStart = parseTime(student.beschikbaarheid[day][0])
  const studentEnd = parseTime(student.beschikbaarheid[day][1])
  
  return startTime >= studentStart && endTime <= studentEnd
}

// Helper function to check if instructor is available on a specific day and time
function isInstructorAvailable(instructor: any, day: string, startTime: number, endTime: number): boolean {
  if (!instructor.beschikbareUren || !instructor.beschikbareUren[day] || instructor.beschikbareUren[day].length < 2) {
    return false
  }
  
  const instructorStart = parseTime(instructor.beschikbareUren[day][0])
  const instructorEnd = parseTime(instructor.beschikbareUren[day][1])
  
  return startTime >= instructorStart && endTime <= instructorEnd
}

// Helper function to check for lesson overlaps
function hasOverlap(existingLessons: any[], newStart: number, newEnd: number, minPause: number): boolean {
  for (const lesson of existingLessons) {
    const lessonStart = parseTime(lesson.startTime)
    const lessonEnd = parseTime(lesson.endTime)
    
    // Check for direct overlap
    if (!(newEnd <= lessonStart || newStart >= lessonEnd)) {
      return true
    }
    
    // Check for insufficient pause
    if (newEnd <= lessonStart) {
      const pause = lessonStart - newEnd
      if (pause < minPause) return true
    } else if (lessonEnd <= newStart) {
      const pause = newStart - lessonEnd
      if (pause < minPause) return true
    }
  }
  return false
}

// Main scheduling function
function generateSchedule(instructor: any, students: any[], weekDates: string[]): any {
  const lessons: any[] = []
  const warnings: string[] = []
  
  // Track lessons per student
  const studentLessons: { [key: string]: number } = {}
  students.forEach(student => {
    studentLessons[student.id] = 0
  })
  
  // Track lessons per day
  const dayLessons: { [key: string]: any[] } = {}
  weekDates.forEach(date => {
    dayLessons[date] = []
  })
  
  // Get day names for the week
  const dayNames = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
  
  // Try to schedule lessons for each student
  for (const student of students) {
    let remainingLessons = student.lessenPerWeek - studentLessons[student.id]
    
    while (remainingLessons > 0) {
      let lessonScheduled = false
      
      // Try each day of the week
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dayName = dayNames[dayIndex]
        const date = weekDates[dayIndex]
        
        if (!isInstructorAvailable(instructor, dayName, 0, 0)) {
          continue // Instructor not available on this day
        }
        
        if (!isStudentAvailable(student, dayName, 0, 0)) {
          continue // Student not available on this day
        }
        
        // Get instructor availability for this day
        const instructorStart = parseTime(instructor.beschikbareUren[dayName][0])
        const instructorEnd = parseTime(instructor.beschikbareUren[dayName][1])
        
        // Get student availability for this day
        const studentStart = parseTime(student.beschikbaarheid[dayName][0])
        const studentEnd = parseTime(student.beschikbaarheid[dayName][1])
        
        // Find available time slots
        const availableStart = Math.max(instructorStart, studentStart)
        const availableEnd = Math.min(instructorEnd, studentEnd)
        
        if (availableEnd - availableStart < student.lesDuur) {
          continue // Not enough time for a lesson
        }
        
        // Try to find a time slot that doesn't overlap with existing lessons
        for (let time = availableStart; time <= availableEnd - student.lesDuur; time += 15) { // 15-minute intervals
          const lessonStart = time
          const lessonEnd = time + student.lesDuur
          
          if (!hasOverlap(dayLessons[date], lessonStart, lessonEnd, instructor.pauzeTussenLessen)) {
            // Schedule the lesson
            const lesson = {
              date: date,
              startTime: formatTime(lessonStart),
              endTime: formatTime(lessonEnd),
              studentId: student.id,
              studentName: student.naam,
              notes: ""
            }
            
            lessons.push(lesson)
            dayLessons[date].push(lesson)
            studentLessons[student.id] += 1
            remainingLessons -= 1
            lessonScheduled = true
            break
          }
        }
        
        if (lessonScheduled) break
      }
      
      if (!lessonScheduled) {
        // Could not schedule this lesson
        warnings.push(`Kon geen les inplannen voor ${student.naam}`)
        break
      }
    }
  }
  
  // Calculate students without lessons
  const studentsWithoutLessons: { [key: string]: number } = {}
  for (const student of students) {
    const missingLessons = student.lessenPerWeek - studentLessons[student.id]
    if (missingLessons > 0) {
      studentsWithoutLessons[student.naam] = missingLessons
    }
  }
  
  // Calculate total time between lessons
  let totalTimeBetweenLessons = 0
  for (const [date, dayLessonsList] of Object.entries(dayLessons)) {
    if (dayLessonsList.length > 1) {
      // Sort lessons by start time
      dayLessonsList.sort((a, b) => a.startTime.localeCompare(b.startTime))
      
      // Calculate gaps between consecutive lessons
      for (let i = 0; i < dayLessonsList.length - 1; i++) {
        const currentEnd = parseTime(dayLessonsList[i].endTime)
        const nextStart = parseTime(dayLessonsList[i + 1].startTime)
        totalTimeBetweenLessons += nextStart - currentEnd
      }
    }
  }
  
  return {
    lessons: lessons,
    leerlingen_zonder_les: studentsWithoutLessons,
    schedule_details: {
      lessen: lessons.length,
      totale_minuten_tussen_lesson: totalTimeBetweenLessons
    },
    summary: `Planning voor komende week: ${lessons.length} lessen ingepland`,
    warnings: warnings
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

    // Map instructor availability
    const dayNames = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
    instructorAvailability?.forEach(avail => {
      const dayName = dayNames[avail.day_of_week]
      if (avail.available) {
        instructor.beschikbareUren[dayName] = [avail.start_time, avail.end_time]
      }
    })

    // Build students data structure
    const students = studentsData.map(student => {
      // Get availability for this student
      const studentAvail = studentAvailability?.find(sa => sa.student_id === student.id)
      
      // Parse availability text to determine available days
      const availabilityText = studentAvail?.notes || 'Flexibel beschikbaar'
      const beschikbaarheid: { [key: string]: string[] } = {}
      
      // Simple parsing - if text contains day names, assume availability
      const dayMapping: { [key: string]: string } = {
        'maandag': 'maandag',
        'monday': 'maandag',
        'dinsdag': 'dinsdag', 
        'tuesday': 'dinsdag',
        'woensdag': 'woensdag',
        'wednesday': 'woensdag',
        'donderdag': 'donderdag',
        'thursday': 'donderdag',
        'vrijdag': 'vrijdag',
        'friday': 'vrijdag',
        'zaterdag': 'zaterdag',
        'saturday': 'zaterdag',
        'zondag': 'zondag',
        'sunday': 'zondag'
      }
      
      const lowerText = availabilityText.toLowerCase()
      for (const [english, dutch] of Object.entries(dayMapping)) {
        if (lowerText.includes(english) || lowerText.includes(dutch)) {
          // Assume 9:00-17:00 availability for mentioned days
          beschikbaarheid[dutch] = ['09:00', '17:00']
        }
      }
      
      // If no specific days mentioned, assume flexible availability
      if (Object.keys(beschikbaarheid).length === 0) {
        dayNames.forEach(day => {
          if (day !== 'zondag') { // Skip Sunday by default
            beschikbaarheid[day] = ['09:00', '17:00']
          }
        })
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

    // Generate schedule
    const result = generateSchedule(instructor, students, weekDates)
    
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