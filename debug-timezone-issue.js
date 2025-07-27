// ============================================================================
// DEBUG TIMEZONE ISSUE WITH WEEK_START CALCULATION
// ============================================================================
// Dit script test het tijdzone probleem met week_start berekening

// Simuleer de getMonday functie uit de frontend
const getMonday = (date) => {
  const newDate = new Date(date)
  const day = newDate.getDay()
  // Sunday is 0, Monday is 1, etc.
  // We want Monday to be the first day of the week
  // If it's Sunday (day 0), we want the next Monday (add 1)
  // If it's Monday (day 1), we want this Monday (add 0)
  // If it's Tuesday (day 2), we want last Monday (subtract 1)
  // etc.
  const daysToMonday = day === 0 ? 1 : day === 1 ? 0 : -(day - 1)
  newDate.setDate(newDate.getDate() + daysToMonday)
  newDate.setHours(0,0,0,0)
  return newDate
}

// Simuleer de getNext8Weeks functie
const getNext8Weeks = () => {
  const weeks = []
  const today = new Date()
  const currentWeekMonday = getMonday(today)
  for (let i = 1; i <= 8; i++) {
    const weekStart = new Date(currentWeekMonday)
    weekStart.setDate(currentWeekMonday.getDate() + (i * 7))
    weeks.push(weekStart)
  }
  return weeks
}

// Test verschillende datums
console.log('=== TIMEZONE DEBUG START ===')

const today = new Date()
console.log('Today:', today.toISOString())
console.log('Today (local):', today.toString())
console.log('Today (date only):', today.toISOString().split('T')[0])

const currentWeekMonday = getMonday(today)
console.log('Current week Monday:', currentWeekMonday.toISOString())
console.log('Current week Monday (local):', currentWeekMonday.toString())
console.log('Current week Monday (date only):', currentWeekMonday.toISOString().split('T')[0])

console.log('\n=== NEXT 8 WEEKS ===')
const next8Weeks = getNext8Weeks()
next8Weeks.forEach((week, index) => {
  const weekEnd = new Date(week)
  weekEnd.setDate(week.getDate() + 6)
  
  console.log(`Week ${index + 1}:`)
  console.log(`  Start: ${week.toISOString().split('T')[0]} (${week.toLocaleDateString('nl-NL')})`)
  console.log(`  End: ${weekEnd.toISOString().split('T')[0]} (${weekEnd.toLocaleDateString('nl-NL')})`)
  console.log(`  Range: ${week.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long' })} - ${weekEnd.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' })}`)
  console.log('')
})

// Test specifieke datum (4 augustus 2025)
console.log('=== TEST SPECIFIC DATE (4 AUGUSTUS 2025) ===')
const testDate = new Date('2025-08-04')
console.log('Test date:', testDate.toISOString())
console.log('Test date (local):', testDate.toString())

const testMonday = getMonday(testDate)
console.log('Test Monday:', testMonday.toISOString())
console.log('Test Monday (local):', testMonday.toString())
console.log('Test Monday (date only):', testMonday.toISOString().split('T')[0])

// Test wat er gebeurt als we een datum selecteren die al maandag is
console.log('\n=== TEST ALREADY MONDAY ===')
const mondayDate = new Date('2025-08-04') // Dit is een maandag
console.log('Monday date:', mondayDate.toISOString())
console.log('Monday date day of week:', mondayDate.getDay()) // 1 = maandag

const mondayResult = getMonday(mondayDate)
console.log('Monday result:', mondayResult.toISOString())
console.log('Monday result (date only):', mondayResult.toISOString().split('T')[0])

// Test wat er gebeurt als we een datum selecteren die niet maandag is
console.log('\n=== TEST NOT MONDAY ===')
const tuesdayDate = new Date('2025-08-05') // Dit is een dinsdag
console.log('Tuesday date:', tuesdayDate.toISOString())
console.log('Tuesday date day of week:', tuesdayDate.getDay()) // 2 = dinsdag

const tuesdayResult = getMonday(tuesdayDate)
console.log('Tuesday result:', tuesdayResult.toISOString())
console.log('Tuesday result (date only):', tuesdayResult.toISOString().split('T')[0])

console.log('\n=== TIMEZONE DEBUG END ===') 