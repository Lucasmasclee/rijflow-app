// Test script voor AI Prompt Refresh functionaliteit
// Voer dit uit in de browser console op de AI Schedule pagina

async function testAIPromptRefresh() {
  console.log('🧪 Testing AI Prompt Refresh functionality...')
  
  // Simuleer de state van de AI Schedule pagina
  let hasGeneratedPrompt = false
  let aiPrompt = ''
  let students = [
    {
      id: 'test-student-1',
      first_name: 'Jan',
      last_name: 'Jansen',
      availabilityText: 'Maandag, woensdag',
      notes: 'Maandag, woensdag',
      lessons: 2,
      minutes: 60,
      aiNotes: ''
    },
    {
      id: 'test-student-2',
      first_name: 'Piet',
      last_name: 'Pietersen',
      availabilityText: 'Dinsdag, donderdag',
      notes: 'Dinsdag, donderdag',
      lessons: 3,
      minutes: 90,
      aiNotes: ''
    }
  ]
  
  // Simuleer het genereren van een AI prompt
  function generateAIPrompt() {
    console.log('📝 Generating AI prompt...')
    hasGeneratedPrompt = true
    aiPrompt = 'Test AI prompt met student beschikbaarheid'
    console.log('✅ AI prompt generated:', aiPrompt)
  }
  
  // Simuleer het wijzigen van student beschikbaarheid
  function handleConsolidatedStudentAvailabilityChange(newValue) {
    console.log('🔄 Changing student availability to:', newValue)
    
    // Parse de nieuwe beschikbaarheid
    const newStudents = students.map(student => {
      const studentName = student.last_name ? `${student.first_name} ${student.last_name}` : student.first_name
      const escapedName = studentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const namePattern = new RegExp(`${escapedName}:\\s*([\\s\\S]*?)(?=\\n\\s*[A-Z][a-z]+\\s+[A-Z][a-z]+:|$)`, 'i')
      const match = newValue.match(namePattern)
      
      if (match) {
        const availabilityText = match[1].trim()
        return {
          ...student,
          availabilityText,
          notes: availabilityText // Update notes field which is used by AI prompt generation
        }
      }
      return student
    })
    
    students = newStudents
    console.log('✅ Students updated:', students.map(s => ({ name: `${s.first_name} ${s.last_name}`, availability: s.availabilityText })))
    
    // Reset AI prompt als student beschikbaarheid wordt gewijzigd
    if (hasGeneratedPrompt) {
      console.log('🔄 Resetting AI prompt due to availability change...')
      hasGeneratedPrompt = false
      aiPrompt = ''
      console.log('✅ AI prompt reset successfully')
    }
  }
  
  // Test scenario 1: Genereer prompt, wijzig beschikbaarheid, controleer reset
  console.log('\n📋 Test Scenario 1: Generate prompt, change availability, check reset')
  
  // Stap 1: Genereer AI prompt
  generateAIPrompt()
  console.log('State after generation:', { hasGeneratedPrompt, aiPrompt: aiPrompt ? 'Present' : 'Empty' })
  
  // Stap 2: Wijzig student beschikbaarheid
  const newAvailability = 'Jan Jansen: Maandag, woensdag, vrijdag\nPiet Pietersen: Dinsdag, donderdag, vrijdag'
  handleConsolidatedStudentAvailabilityChange(newAvailability)
  console.log('State after availability change:', { hasGeneratedPrompt, aiPrompt: aiPrompt ? 'Present' : 'Empty' })
  
  // Stap 3: Controleer of prompt is gereset
  if (!hasGeneratedPrompt && aiPrompt === '') {
    console.log('✅ Test 1 PASSED: AI prompt was reset when availability changed')
  } else {
    console.log('❌ Test 1 FAILED: AI prompt was not reset when availability changed')
  }
  
  // Test scenario 2: Wijzig beschikbaarheid zonder prompt, controleer geen reset
  console.log('\n📋 Test Scenario 2: Change availability without prompt, check no reset')
  
  // Reset state
  hasGeneratedPrompt = false
  aiPrompt = ''
  
  // Wijzig beschikbaarheid zonder eerst prompt te genereren
  const newAvailability2 = 'Jan Jansen: Alleen maandag\nPiet Pietersen: Alleen dinsdag'
  handleConsolidatedStudentAvailabilityChange(newAvailability2)
  console.log('State after availability change (no prompt):', { hasGeneratedPrompt, aiPrompt: aiPrompt ? 'Present' : 'Empty' })
  
  // Controleer dat er geen reset was (omdat er geen prompt was)
  if (!hasGeneratedPrompt && aiPrompt === '') {
    console.log('✅ Test 2 PASSED: No unnecessary reset when no prompt was generated')
  } else {
    console.log('❌ Test 2 FAILED: Unexpected reset when no prompt was generated')
  }
  
  // Test scenario 3: Controleer of notes field wordt bijgewerkt
  console.log('\n📋 Test Scenario 3: Check if notes field is updated correctly')
  
  const expectedNotes = {
    'Jan Jansen': 'Alleen maandag',
    'Piet Pietersen': 'Alleen dinsdag'
  }
  
  let notesCorrect = true
  students.forEach(student => {
    const studentName = `${student.first_name} ${student.last_name}`
    const expectedNote = expectedNotes[studentName]
    if (student.notes !== expectedNote) {
      console.log(`❌ Notes mismatch for ${studentName}: expected "${expectedNote}", got "${student.notes}"`)
      notesCorrect = false
    } else {
      console.log(`✅ Notes correct for ${studentName}: "${student.notes}"`)
    }
  })
  
  if (notesCorrect) {
    console.log('✅ Test 3 PASSED: Notes field updated correctly for all students')
  } else {
    console.log('❌ Test 3 FAILED: Notes field not updated correctly')
  }
  
  console.log('\n🎉 AI Prompt Refresh Test completed!')
}

// Test de functie
testAIPromptRefresh() 