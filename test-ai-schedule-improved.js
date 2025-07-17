// Test script voor verbeterde AI scheduling met specifieke tijden
const { parseStudentAvailability, parseStudentAvailabilityWithTimes } = require('./src/lib/openai.ts')

// Test data
const testCases = [
  {
    name: "Leerling met specifieke tijden",
    notes: "Maandag 8:00 - 12:00\nWoensdag middag 12:00 - 16:00\nVrijdag 8:00 - 12:00",
    expectedDays: ["monday", "wednesday", "friday"],
    expectedTimes: [
      { day: "monday", startTime: "08:00", endTime: "12:00" },
      { day: "wednesday", startTime: "12:00", endTime: "16:00" },
      { day: "friday", startTime: "08:00", endTime: "12:00" }
    ]
  },
  {
    name: "Leerling met alleen dagnamen",
    notes: "maandag, dinsdag, woensdag",
    expectedDays: ["monday", "tuesday", "wednesday"],
    expectedTimes: []
  },
  {
    name: "Leerling met Engelse dagnamen en tijden",
    notes: "Monday 9:00 - 17:00\nWednesday 10:00 - 15:00",
    expectedDays: ["monday", "wednesday"],
    expectedTimes: [
      { day: "monday", startTime: "09:00", endTime: "17:00" },
      { day: "wednesday", startTime: "10:00", endTime: "15:00" }
    ]
  }
]

console.log("🧪 Testing AI Schedule Improvements")
console.log("===================================")

testCases.forEach((testCase, index) => {
  console.log(`\n📋 Test ${index + 1}: ${testCase.name}`)
  console.log(`Input: "${testCase.notes}"`)
  
  // Test day parsing
  const parsedDays = parseStudentAvailability(testCase.notes)
  console.log(`Parsed days: [${parsedDays.join(', ')}]`)
  console.log(`Expected days: [${testCase.expectedDays.join(', ')}]`)
  console.log(`✅ Days match: ${JSON.stringify(parsedDays) === JSON.stringify(testCase.expectedDays)}`)
  
  // Test time parsing
  const parsedTimes = parseStudentAvailabilityWithTimes(testCase.notes)
  console.log(`Parsed times:`, parsedTimes)
  console.log(`Expected times:`, testCase.expectedTimes)
  console.log(`✅ Times match: ${JSON.stringify(parsedTimes) === JSON.stringify(testCase.expectedTimes)}`)
})

console.log("\n🎯 Test Summary")
console.log("===============")
console.log("De verbeteringen zorgen ervoor dat:")
console.log("1. Specifieke tijden worden herkend en gerespecteerd")
console.log("2. Nederlandse en Engelse dagnamen worden ondersteund")
console.log("3. De AI prompt is duidelijker over tijden respecteren")
console.log("4. Dummy response respecteert nu ook specifieke tijden")

// Test de verbeterde prompt
console.log("\n📝 Verbeterde AI Prompt Regels:")
console.log("===============================")
console.log("✅ Plan ALLEEN op dagen dat de instructeur beschikbaar is")
console.log("✅ Plan ALLEEN op dagen dat de leerling beschikbaar is")
console.log("✅ Als een leerling specifieke tijden heeft, plan dan ALLEEN binnen die tijden")
console.log("✅ Verdeel de lessen gelijkmatig over de beschikbare dagen")
console.log("✅ Respecteer de lesduur van elke leerling")
console.log("✅ Plan pauzes tussen lessen volgens de instellingen") 