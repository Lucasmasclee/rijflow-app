// Simpele test voor tijdzone fix
const getMonday = (date) => {
  // Gebruik UTC methoden om tijdzone problemen te voorkomen
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  
  // Maak een nieuwe datum in UTC
  const newDate = new Date(Date.UTC(year, month, day))
  const dayOfWeek = newDate.getUTCDay()
  
  // Sunday is 0, Monday is 1, etc.
  // We want Monday to be the first day of the week
  // If it's Sunday (day 0), we want the next Monday (add 1)
  // If it's Monday (day 1), we want this Monday (add 0)
  // If it's Tuesday (day 2), we want last Monday (subtract 1)
  // etc.
  const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : -(dayOfWeek - 1)
  
  // Voeg dagen toe in UTC
  newDate.setUTCDate(newDate.getUTCDate() + daysToMonday)
  newDate.setUTCHours(0, 0, 0, 0)
  
  return newDate
}

console.log('=== SIMPLE TIMEZONE TEST (UTC FIX) ===')

// Test 4 augustus 2025 (maandag)
const testDate = new Date('2025-08-04')
console.log('Input date: 2025-08-04')
console.log('Input UTC day of week:', testDate.getUTCDay()) // 1 = maandag

const result = getMonday(testDate)
console.log('Result date:', result.toISOString().split('T')[0])
console.log('Expected: 2025-08-04')
console.log('Match:', result.toISOString().split('T')[0] === '2025-08-04')

// Test 5 augustus 2025 (dinsdag)
const testDate2 = new Date('2025-08-05')
console.log('\nInput date: 2025-08-05')
console.log('Input UTC day of week:', testDate2.getUTCDay()) // 2 = dinsdag

const result2 = getMonday(testDate2)
console.log('Result date:', result2.toISOString().split('T')[0])
console.log('Expected: 2025-08-04')
console.log('Match:', result2.toISOString().split('T')[0] === '2025-08-04')

// Test huidige datum
console.log('\nCurrent date test:')
const today = new Date()
console.log('Today:', today.toISOString().split('T')[0])
console.log('Today UTC day:', today.getUTCDay())
const todayMonday = getMonday(today)
console.log('Today Monday:', todayMonday.toISOString().split('T')[0]) 