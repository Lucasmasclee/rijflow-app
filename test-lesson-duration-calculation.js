// Test script voor lesduur berekening
// Dit script test de calculateLessonCount functie

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
  // Als de duur tussen (n*defaultDuration - 5) en (n*defaultDuration + 5) ligt, tel als n lessen
  const baseCount = Math.floor(actualDuration / defaultLessonDuration)
  const remainder = actualDuration % defaultLessonDuration
  
  // Als de rest meer dan 5 minuten is, tel als extra les
  if (remainder > 5) {
    return Math.max(1, baseCount + 1)
  } else {
    return Math.max(1, baseCount)
  }
}

// Test cases
console.log('=== Test Lesduur Berekening ===')
console.log('Standaard lesduur: 50 minuten')
console.log('')

const testCases = [
  { start: '09:00', end: '10:00', expected: 2, description: '1 uur les (60 min)' },
  { start: '09:00', end: '09:50', expected: 1, description: '50 minuten les' },
  { start: '09:00', end: '10:40', expected: 2, description: '1 uur 40 minuten les (100 min)' },
  { start: '09:00', end: '10:30', expected: 2, description: '1 uur 30 minuten les (90 min)' },
  { start: '09:00', end: '10:20', expected: 2, description: '1 uur 20 minuten les (80 min)' },
  { start: '09:00', end: '09:45', expected: 1, description: '45 minuten les' },
  { start: '09:00', end: '11:00', expected: 3, description: '2 uur les (120 min)' },
  { start: '09:00', end: '11:30', expected: 3, description: '2.5 uur les (150 min)' },
  { start: '09:00', end: '09:55', expected: 1, description: '55 minuten les' },
  { start: '09:00', end: '10:05', expected: 2, description: '1 uur 5 minuten les (65 min)' },
]

testCases.forEach((testCase, index) => {
  const result = calculateLessonCount(testCase.start, testCase.end, 50)
  const status = result === testCase.expected ? '✅' : '❌'
  console.log(`${status} Test ${index + 1}: ${testCase.description}`)
  console.log(`   ${testCase.start} - ${testCase.end} = ${result} lessen (verwacht: ${testCase.expected})`)
  console.log('')
})

console.log('=== Test met verschillende standaard lesduur ===')
console.log('')

const durationTests = [
  { duration: 30, start: '09:00', end: '10:00', description: '1 uur les met 30 min standaard' },
  { duration: 45, start: '09:00', end: '10:00', description: '1 uur les met 45 min standaard' },
  { duration: 60, start: '09:00', end: '10:00', description: '1 uur les met 60 min standaard' },
  { duration: 30, start: '09:00', end: '10:30', description: '1.5 uur les met 30 min standaard' },
  { duration: 45, start: '09:00', end: '10:30', description: '1.5 uur les met 45 min standaard' },
]

durationTests.forEach((testCase, index) => {
  const result = calculateLessonCount(testCase.start, testCase.end, testCase.duration)
  console.log(`Test ${index + 1}: ${testCase.description}`)
  console.log(`   ${testCase.start} - ${testCase.end} (${testCase.duration} min standaard) = ${result} lessen`)
  console.log('')
}) 