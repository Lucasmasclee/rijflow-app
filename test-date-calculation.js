// Test script voor datum berekening
// Voer dit uit in de browser console om te testen

function getMonday(date) {
  const newDate = new Date(date)
  const day = newDate.getDay()
  const diff = newDate.getDate() - day + (day === 0 ? -6 : 1)
  newDate.setDate(diff)
  return newDate
}

function formatDateToISO(date) {
  // Zorg ervoor dat we de maandag van de geselecteerde week krijgen
  const mondayOfWeek = getMonday(date)
  return mondayOfWeek.toISOString().split('T')[0]
}

// Test cases
console.log('=== DATUM BEREKENING TEST ===')

// Test 1: Huidige datum
const today = new Date()
console.log('Huidige datum:', today.toISOString().split('T')[0])
console.log('Maandag van deze week:', getMonday(today).toISOString().split('T')[0])

// Test 2: Specifieke datum (2025-07-28 - maandag)
const testDate1 = new Date('2025-07-28')
console.log('Test datum 1 (2025-07-28):', testDate1.toISOString().split('T')[0])
console.log('Maandag van deze week:', getMonday(testDate1).toISOString().split('T')[0])
console.log('Formatted result:', formatDateToISO(testDate1))

// Test 3: Dinsdag van dezelfde week
const testDate2 = new Date('2025-07-29')
console.log('Test datum 2 (2025-07-29):', testDate2.toISOString().split('T')[0])
console.log('Maandag van deze week:', getMonday(testDate2).toISOString().split('T')[0])
console.log('Formatted result:', formatDateToISO(testDate2))

// Test 4: Zondag van dezelfde week
const testDate3 = new Date('2025-08-03')
console.log('Test datum 3 (2025-08-03):', testDate3.toISOString().split('T')[0])
console.log('Maandag van deze week:', getMonday(testDate3).toISOString().split('T')[0])
console.log('Formatted result:', formatDateToISO(testDate3))

// Test 5: Volgende week maandag
const testDate4 = new Date('2025-08-04')
console.log('Test datum 4 (2025-08-04):', testDate4.toISOString().split('T')[0])
console.log('Maandag van deze week:', getMonday(testDate4).toISOString().split('T')[0])
console.log('Formatted result:', formatDateToISO(testDate4))

console.log('=== EINDE TEST ===')

// Verwacht resultaat:
// Alle datums in de week van 2025-07-28 tot 2025-08-03 moeten resulteren in 2025-07-28
// Alle datums in de week van 2025-08-04 tot 2025-08-10 moeten resulteren in 2025-08-04 