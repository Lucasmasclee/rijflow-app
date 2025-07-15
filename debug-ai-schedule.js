// Debug script voor AI Schedule validatie
// Voer dit uit in de browser console op de AI Schedule pagina

async function debugAIScheduleValidation() {
  console.log('🔍 Debugging AI Schedule validation...')
  
  // Haal de huidige student data op
  const students = window.students || []
  console.log('📊 Current students data:', students)
  
  // Valideer elke student
  // Alleen voornaam is verplicht, achternaam is optioneel
  const validationResults = students.map(student => {
    const errors = []
    
    if (!student.id) errors.push('ID ontbreekt')
    if (!student.first_name || student.first_name.trim() === '') errors.push('Voornaam ontbreekt')
    // Achternaam is optioneel, dus geen validatie nodig
    if (!student.lessons || student.lessons < 1) errors.push('Aantal lessen moet minimaal 1 zijn')
    if (!student.minutes || student.minutes < 30) errors.push('Lesduur moet minimaal 30 minuten zijn')
    
    return {
      student: `${student.first_name || 'Onbekend'} ${student.last_name || ''}`,
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      firstNameLength: student.first_name?.length || 0,
      lastNameLength: student.last_name?.length || 0,
      lessons: student.lessons,
      minutes: student.minutes,
      errors: errors,
      isValid: errors.length === 0
    }
  })
  
  console.log('✅ Validation results:', validationResults)
  
  const invalidStudents = validationResults.filter(r => !r.isValid)
  const validStudents = validationResults.filter(r => r.isValid)
  
  console.log(`📈 Summary: ${validStudents.length} valid, ${invalidStudents.length} invalid`)
  
  if (invalidStudents.length > 0) {
    console.error('❌ Invalid students found:')
    invalidStudents.forEach(student => {
      console.error(`  - ${student.student}: ${student.errors.join(', ')}`)
      console.error(`    ID: ${student.id}`)
      console.error(`    First Name: "${student.firstName}" (length: ${student.firstNameLength})`)
      console.error(`    Last Name: "${student.lastName}" (length: ${student.lastNameLength})`)
      console.error(`    Display Name: "${student.student}"`)
    })
  } else {
    console.log('✅ All students are valid!')
  }
  
  return validationResults
}

// Test de API call met huidige data
async function testAPICall() {
  console.log('🧪 Testing API call with current data...')
  
  try {
    // Simuleer de data die naar de API wordt gestuurd
    const availability = window.availability || []
    const students = window.students || []
    const settings = window.settings || {}
    
    const requestData = {
      instructorAvailability: availability,
      students: students.map(student => ({
        id: student.id,
        firstName: student.first_name || '',
        lastName: student.last_name || '', // Achternaam is optioneel
        lessons: Math.max(1, student.lessons || student.default_lessons_per_week || 2),
        minutes: Math.max(30, student.minutes || student.default_lesson_duration_minutes || 60),
        aiNotes: student.aiNotes || '',
        notes: student.notes || ''
      })),
      settings
    }
    
    console.log('📤 Request data:', requestData)
    
    const response = await fetch('/api/ai-schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ API Error:', errorData)
      return errorData
    }
    
    const result = await response.json()
    console.log('✅ API Success:', result)
    return result
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return error
  }
}

// Nieuwe functie om database student data direct te controleren
async function checkDatabaseStudents() {
  console.log('🗄️ Checking database students directly...')
  
  try {
    const response = await fetch('/api/test-env', {
      method: 'GET'
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Database check result:', data)
      return data
    } else {
      console.error('❌ Database check failed')
      return null
    }
  } catch (error) {
    console.error('❌ Database check error:', error)
    return null
  }
}

// Functie om alle debug functies uit te voeren
async function runAllDebugChecks() {
  console.log('🚀 Running all debug checks...')
  
  // 1. Valideer huidige student data
  await debugAIScheduleValidation()
  
  // 2. Test API call
  await testAPICall()
  
  // 3. Check database direct
  await checkDatabaseStudents()
  
  console.log('✅ All debug checks completed!')
}

// Export functies voor gebruik in console
window.debugAIScheduleValidation = debugAIScheduleValidation
window.testAPICall = testAPICall
window.checkDatabaseStudents = checkDatabaseStudents
window.runAllDebugChecks = runAllDebugChecks

console.log('🔧 Debug functions loaded!')
console.log('Available functions:')
console.log('- debugAIScheduleValidation()')
console.log('- testAPICall()')
console.log('- checkDatabaseStudents()')
console.log('- runAllDebugChecks()') 