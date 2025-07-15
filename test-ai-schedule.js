// Test script voor AI Schedule functionaliteit
// Voer dit uit in de browser console op de AI Schedule pagina

async function testAISchedule() {
  console.log('🧪 Testing AI Schedule functionality...')
  
  // Test data
  const testRequest = {
    instructorAvailability: [
      { day: 'monday', available: true, startTime: '09:00', endTime: '17:00' },
      { day: 'tuesday', available: true, startTime: '09:00', endTime: '17:00' },
      { day: 'wednesday', available: true, startTime: '09:00', endTime: '17:00' },
      { day: 'thursday', available: true, startTime: '09:00', endTime: '17:00' },
      { day: 'friday', available: true, startTime: '09:00', endTime: '17:00' },
      { day: 'saturday', available: false, startTime: '09:00', endTime: '17:00' },
      { day: 'sunday', available: false, startTime: '09:00', endTime: '17:00' }
    ],
    students: [
      {
        id: 'test-student-1',
        firstName: 'Jan',
        lastName: 'Jansen',
        lessons: 2,
        minutes: 60,
        aiNotes: 'Kan goed parkeren',
        notes: 'Beschikbaar maandag en woensdag'
      },
      {
        id: 'test-student-2',
        firstName: 'Piet',
        lastName: 'Pietersen',
        lessons: 3,
        minutes: 90,
        aiNotes: 'Nog beginner',
        notes: 'Beschikbaar dinsdag en donderdag'
      }
    ],
    settings: {
      connectLocations: true,
      numberOfBreaks: 2,
      minutesPerBreak: 15,
      minutesBreakEveryLesson: 5,
      breakAfterEachStudent: false,
      additionalSpecifications: 'Plan lessen in de ochtend'
    }
  }

  try {
    console.log('📤 Sending test request to AI Schedule API...')
    
    const response = await fetch('/api/ai-schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ API Error:', errorData)
      return
    }

    const result = await response.json()
    console.log('✅ AI Schedule Response:', result)
    
    // Valideer response
    if (result.lessons && Array.isArray(result.lessons)) {
      console.log(`✅ Generated ${result.lessons.length} lessons`)
      
      result.lessons.forEach((lesson, index) => {
        console.log(`📅 Lesson ${index + 1}:`, {
          date: lesson.date,
          time: `${lesson.startTime} - ${lesson.endTime}`,
          student: lesson.studentName,
          notes: lesson.notes
        })
      })
    } else {
      console.error('❌ Invalid response format - no lessons array')
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.warn('⚠️ Warnings:', result.warnings)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Test bulk lessons API
async function testBulkLessons() {
  console.log('🧪 Testing Bulk Lessons API...')
  
  const testLessons = [
    {
      date: '2024-01-15',
      startTime: '09:00',
      endTime: '10:00',
      studentId: 'test-student-1',
      studentName: 'Jan Jansen',
      notes: 'Test les'
    },
    {
      date: '2024-01-15',
      startTime: '10:30',
      endTime: '12:00',
      studentId: 'test-student-2',
      studentName: 'Piet Pietersen',
      notes: 'Test les 2'
    }
  ]

  try {
    console.log('📤 Sending test lessons to bulk API...')
    
    const response = await fetch('/api/lessons/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lessons: testLessons,
        instructorId: 'test-instructor-id'
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Bulk API Error:', errorData)
      return
    }

    const result = await response.json()
    console.log('✅ Bulk Lessons Response:', result)
    
  } catch (error) {
    console.error('❌ Bulk test failed:', error)
  }
}

// Run tests
console.log('🚀 Starting AI Schedule tests...')
testAISchedule().then(() => {
  console.log('✅ AI Schedule test completed')
  // Uncomment the line below to test bulk lessons (requires valid instructor ID)
  // testBulkLessons()
}) 