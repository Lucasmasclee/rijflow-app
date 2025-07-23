// Debug script voor lesberekeningen
// Dit script test de lesberekeningen zonder database toegang

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

// Test data - simulatie van echte lessen
const testLessons = [
  { start_time: '09:00', end_time: '10:00', date: '2025-01-20', status: 'completed' },
  { start_time: '10:00', end_time: '11:00', date: '2025-01-20', status: 'completed' },
  { start_time: '14:00', end_time: '15:30', date: '2025-01-21', status: 'completed' },
  { start_time: '16:00', end_time: '17:00', date: '2025-01-22', status: 'scheduled' },
  { start_time: '09:00', end_time: '10:40', date: '2025-01-23', status: 'scheduled' },
  { start_time: '11:00', end_time: '12:00', date: '2025-01-24', status: 'scheduled' }
]

// Test verschillende standaard lesduren
const testDurations = [30, 45, 50, 60]

console.log('=== Debug Lesberekeningen ===\n')

// Test 1: Individuele lessen
console.log('1. Test individuele lessen:')
testLessons.forEach((lesson, index) => {
  console.log(`   Les ${index + 1}: ${lesson.start_time}-${lesson.end_time}`)
  
  testDurations.forEach(duration => {
    const count = calculateLessonCount(lesson.start_time, lesson.end_time, duration)
    const actualDuration = parseTimeToMinutes(lesson.end_time) - parseTimeToMinutes(lesson.start_time)
    console.log(`     Met ${duration} min standaard: ${actualDuration} min = ${count} lessen`)
  })
  console.log()
})

// Test 2: Totaal aantal lessen
console.log('2. Test totaal aantal lessen:')
testDurations.forEach(duration => {
  const totalCount = calculateTotalLessonCount(testLessons, duration)
  console.log(`   Met ${duration} min standaard: ${totalCount} lessen (van ${testLessons.length} les records)`)
})
console.log()

// Test 3: Gescheiden voltooide en geplande lessen
console.log('3. Test gescheiden lessen:')
const today = '2025-01-22'
const completedLessons = testLessons.filter(lesson => lesson.date <= today)
const scheduledLessons = testLessons.filter(lesson => lesson.date > today)

console.log(`   Voltooide lessen: ${completedLessons.length} records`)
console.log(`   Geplande lessen: ${scheduledLessons.length} records`)

testDurations.forEach(duration => {
  const completedCount = calculateTotalLessonCount(completedLessons, duration)
  const scheduledCount = calculateTotalLessonCount(scheduledLessons, duration)
  console.log(`   Met ${duration} min standaard: ${completedCount} voltooid, ${scheduledCount} gepland`)
})
console.log()

// Test 4: Edge cases
console.log('4. Test edge cases:')
const edgeCases = [
  { start_time: '09:00', end_time: '09:30', description: '30 minuten les' },
  { start_time: '09:00', end_time: '09:45', description: '45 minuten les' },
  { start_time: '09:00', end_time: '09:55', description: '55 minuten les' },
  { start_time: '09:00', end_time: '10:05', description: '65 minuten les' },
  { start_time: '09:00', end_time: '10:30', description: '90 minuten les' },
  { start_time: '09:00', end_time: '11:00', description: '120 minuten les' }
]

edgeCases.forEach((lesson, index) => {
  console.log(`   ${lesson.description}: ${lesson.start_time}-${lesson.end_time}`)
  
  testDurations.forEach(duration => {
    const count = calculateLessonCount(lesson.start_time, lesson.end_time, duration)
    const actualDuration = parseTimeToMinutes(lesson.end_time) - parseTimeToMinutes(lesson.start_time)
    console.log(`     Met ${duration} min standaard: ${actualDuration} min = ${count} lessen`)
  })
  console.log()
})

console.log('=== Einde Debug ===') 