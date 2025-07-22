// Test script voor datum berekening
// Voer dit uit in de browser console om te testen

function getMonday(date) {
  const newDate = new Date(date)
  const day = newDate.getDay() // 0 = zondag, 1 = maandag, ..., 6 = zaterdag
  // Bereken hoeveel dagen we terug moeten naar maandag
  // Als het zondag is (day = 0), dan moeten we 6 dagen terug
  // Als het maandag is (day = 1), dan hoeven we 0 dagen terug
  // Als het dinsdag is (day = 2), dan moeten we 1 dag terug
  // etc.
  const daysToSubtract = day === 0 ? 6 : day - 1
  newDate.setDate(newDate.getDate() - daysToSubtract)
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

// Test 2: Maandag (2025-07-28)
const testDate1 = new Date('2025-07-28')
console.log('Test datum 1 (2025-07-28 - maandag):', testDate1.toISOString().split('T')[0])
console.log('Maandag van deze week:', getMonday(testDate1).toISOString().split('T')[0])
console.log('Formatted result:', formatDateToISO(testDate1))

// Test 3: Dinsdag van dezelfde week (2025-07-29)
const testDate2 = new Date('2025-07-29')
console.log('Test datum 2 (2025-07-29 - dinsdag):', testDate2.toISOString().split('T')[0])
console.log('Maandag van deze week:', getMonday(testDate2).toISOString().split('T')[0])
console.log('Formatted result:', formatDateToISO(testDate2))

// Test 4: Zondag van dezelfde week (2025-08-03)
const testDate3 = new Date('2025-08-03')
console.log('Test datum 3 (2025-08-03 - zondag):', testDate3.toISOString().split('T')[0])
console.log('Maandag van deze week:', getMonday(testDate3).toISOString().split('T')[0])
console.log('Formatted result:', formatDateToISO(testDate3))

// Test 5: Volgende week maandag (2025-08-04)
const testDate4 = new Date('2025-08-04')
console.log('Test datum 4 (2025-08-04 - maandag):', testDate4.toISOString().split('T')[0])
console.log('Maandag van deze week:', getMonday(testDate4).toISOString().split('T')[0])
console.log('Formatted result:', formatDateToISO(testDate4))

// Test 6: Woensdag van de eerste week (2025-07-30)
const testDate5 = new Date('2025-07-30')
console.log('Test datum 5 (2025-07-30 - woensdag):', testDate5.toISOString().split('T')[0])
console.log('Maandag van deze week:', getMonday(testDate5).toISOString().split('T')[0])
console.log('Formatted result:', formatDateToISO(testDate5))

// Test 7: Zaterdag van de eerste week (2025-08-02)
const testDate6 = new Date('2025-08-02')
console.log('Test datum 6 (2025-08-02 - zaterdag):', testDate6.toISOString().split('T')[0])
console.log('Maandag van deze week:', getMonday(testDate6).toISOString().split('T')[0])
console.log('Formatted result:', formatDateToISO(testDate6))

console.log('=== EINDE TEST ===')

// Verwacht resultaat:
// Alle datums in de week van 2025-07-28 tot 2025-08-03 moeten resulteren in 2025-07-28
// Alle datums in de week van 2025-08-04 tot 2025-08-10 moeten resulteren in 2025-08-04
// 
// Correcte logica:
// - Zondag (day = 0): 6 dagen terug naar maandag
// - Maandag (day = 1): 0 dagen terug (blijft maandag)
// - Dinsdag (day = 2): 1 dag terug naar maandag
// - Woensdag (day = 3): 2 dagen terug naar maandag
// - Donderdag (day = 4): 3 dagen terug naar maandag
// - Vrijdag (day = 5): 4 dagen terug naar maandag
// - Zaterdag (day = 6): 5 dagen terug naar maandag 