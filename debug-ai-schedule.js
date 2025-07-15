// Debug script voor AI Schedule validatie
// Voer dit uit in de browser console op de AI Schedule pagina

async function debugAIScheduleValidation() {
  console.log('🔍 Debugging AI Schedule validation...')
  
  // Haal de huidige student data op
  const students = window.students || []
  console.log('📊 Current students data:', students)
  
  // Valideer elke student
  const validationResults = students.map(student => {
    const errors = []
    
    if (!student.id) errors.push('ID ontbreekt')
    if (!student.first_name || student.first_name.trim() === '') errors.push('Voornaam ontbreekt')
    if (!student.last_name || student.last_name.trim() === '') errors.push('Achternaam ontbreekt')
    if (!student.lessons || student.lessons < 1) errors.push('Aantal lessen moet minimaal 1 zijn')
    if (!student.minutes || student.minutes < 30) errors.push('Lesduur moet minimaal 30 minuten zijn')
    
    return {
      student: `${student.first_name || 'Onbekend'} ${student.last_name || 'Onbekend'}`,
      id: student.id,
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
        lastName: student.last_name || '',
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

// Expose functions globally
window.debugAIScheduleValidation = debugAIScheduleValidation
window.testAPICall = testAPICall

console.log('🚀 Debug functions loaded!')
console.log('Run debugAIScheduleValidation() to check student data')
console.log('Run testAPICall() to test the API directly') 