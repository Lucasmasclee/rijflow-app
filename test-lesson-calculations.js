// Test script voor lesberekeningen debug
// Dit script test de huidige implementatie van lesberekeningen

const { createClient } = require('@supabase/supabase-js')

// Vervang deze waarden met je eigen Supabase configuratie
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

// Functies uit lesson-utils.ts
function parseTimeToMinutes(time) {
  if (!time || typeof time !== 'string') {
    return -1
  }

  const parts = time.split(':')
  if (parts.length !== 2) {
    return -1
  }

  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return -1
  }

  return hours * 60 + minutes
}

function calculateLessonCount(startTime, endTime, defaultLessonDuration) {
  if (!startTime || !endTime || defaultLessonDuration <= 0) {
    return 1 // Fallback naar 1 les
  }

  // Parse tijden naar minuten sinds middernacht
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)
  
  if (startMinutes === -1 || endMinutes === -1 || endMinutes <= startMinutes) {
    return 1 // Fallback naar 1 les
  }

  const actualDuration = endMinutes - startMinutes
  
  // Bereken aantal lessen met een marge van 5 minuten
  const baseCount = Math.floor(actualDuration / defaultLessonDuration)
  const remainder = actualDuration % defaultLessonDuration
  
  // Als de rest meer dan 5 minuten is, tel als extra les
  if (remainder > 5) {
    return Math.max(1, baseCount + 1)
  } else {
    return Math.max(1, baseCount)
  }
}

function calculateTotalLessonCount(lessons, defaultLessonDuration) {
  return lessons.reduce((total, lesson) => {
    return total + calculateLessonCount(lesson.start_time, lesson.end_time, defaultLessonDuration)
  }, 0)
}

async function getDefaultLessonDuration(instructorId) {
  try {
    const { data, error } = await supabase
      .from('standard_availability')
      .select('default_lesson_duration')
      .eq('instructor_id', instructorId)
      .single()

    if (error || !data) {
      console.warn('Could not fetch default lesson duration, using fallback of 50 minutes')
      return 50
    }

    return data.default_lesson_duration || 50
  } catch (error) {
    console.error('Error fetching default lesson duration:', error)
    return 50
  }
}

async function testLessonCalculations() {
  console.log('=== Test Lesberekeningen ===\n')

  try {
    // 1. Test standaard lesduur ophalen
    console.log('1. Test standaard lesduur ophalen...')
    const defaultDuration = await getDefaultLessonDuration('test-instructor-id')
    console.log(`   Standaard lesduur: ${defaultDuration} minuten\n`)

    // 2. Test enkele lessen ophalen
    console.log('2. Test lessen ophalen...')
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('date, start_time, end_time, status, student_id')
      .limit(10)

    if (error) {
      console.error('   Fout bij ophalen lessen:', error)
      return
    }

    console.log(`   ${lessons.length} lessen gevonden\n`)

    // 3. Test individuele lesberekeningen
    console.log('3. Test individuele lesberekeningen...')
    lessons.forEach((lesson, index) => {
      const lessonCount = calculateLessonCount(lesson.start_time, lesson.end_time, defaultDuration)
      const actualDuration = parseTimeToMinutes(lesson.end_time) - parseTimeToMinutes(lesson.start_time)
      
      console.log(`   Les ${index + 1}: ${lesson.start_time}-${lesson.end_time} (${actualDuration} min) = ${lessonCount} lessen`)
    })
    console.log()

    // 4. Test totale lesberekening
    console.log('4. Test totale lesberekening...')
    const totalCount = calculateTotalLessonCount(lessons, defaultDuration)
    console.log(`   Totaal aantal lessen: ${totalCount} (van ${lessons.length} les records)\n`)

    // 5. Test per student
    console.log('5. Test per student...')
    const students = [...new Set(lessons.map(l => l.student_id))]
    
    for (const studentId of students) {
      const studentLessons = lessons.filter(l => l.student_id === studentId)
      const studentCount = calculateTotalLessonCount(studentLessons, defaultDuration)
      console.log(`   Student ${studentId}: ${studentCount} lessen (van ${studentLessons.length} les records)`)
    }
    console.log()

    // 6. Test met verschillende standaard lesduren
    console.log('6. Test met verschillende standaard lesduren...')
    const testDurations = [30, 45, 50, 60]
    
    for (const duration of testDurations) {
      const count = calculateTotalLessonCount(lessons, duration)
      console.log(`   Met ${duration} min standaard: ${count} lessen`)
    }

  } catch (error) {
    console.error('Fout tijdens test:', error)
  }
}

// Voer de test uit
testLessonCalculations() 