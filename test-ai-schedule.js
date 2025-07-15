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

// Test student availability parsing specifically
async function testStudentAvailability() {
  console.log('🧪 Testing Student Availability Parsing...')
  
  // Test case: Student only available Monday, Tuesday, Friday
  // Instructor available Monday, Tuesday, Wednesday, Friday
  // Should only plan on Monday, Tuesday, Friday
  const testRequest = {
    instructorAvailability: [
      { day: 'monday', available: true, startTime: '09:00', endTime: '17:00' },
      { day: 'tuesday', available: true, startTime: '09:00', endTime: '17:00' },
      { day: 'wednesday', available: true, startTime: '09:00', endTime: '17:00' },
      { day: 'thursday', available: false, startTime: '09:00', endTime: '17:00' },
      { day: 'friday', available: true, startTime: '09:00', endTime: '17:00' },
      { day: 'saturday', available: false, startTime: '09:00', endTime: '17:00' },
      { day: 'sunday', available: false, startTime: '09:00', endTime: '17:00' }
    ],
    students: [
      {
        id: 'test-student-availability',
        firstName: 'Test',
        lastName: 'Student',
        lessons: 3,
        minutes: 60,
        aiNotes: 'Test beschikbaarheid',
        notes: 'maandag ochtend, dinsdag middag, vrijdag ochtend'
      }
    ],
    settings: {
      connectLocations: true,
      numberOfBreaks: 1,
      minutesPerBreak: 15,
      minutesBreakEveryLesson: 5,
      breakAfterEachStudent: false,
      additionalSpecifications: ''
    }
  }

  try {
    console.log('📤 Testing student availability parsing...')
    console.log('Student notes:', testRequest.students[0].notes)
    console.log('Instructor available days:', testRequest.instructorAvailability.filter(d => d.available).map(d => d.day))
    
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
    console.log('✅ Student Availability Test Response:', result)
    
    // Check if lessons are only on allowed days
    if (result.lessons && Array.isArray(result.lessons)) {
      const allowedDays = ['monday', 'tuesday', 'friday']
      const lessonDays = result.lessons.map(lesson => {
        const date = new Date(lesson.date)
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        return dayNames[date.getDay()]
      })
      
      console.log('📅 Generated lesson days:', lessonDays)
      
      const invalidDays = lessonDays.filter(day => !allowedDays.includes(day))
      if (invalidDays.length > 0) {
        console.error('❌ Lessons planned on invalid days:', invalidDays)
      } else {
        console.log('✅ All lessons planned on allowed days!')
      }
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.warn('⚠️ Warnings:', result.warnings)
    }
    
  } catch (error) {
    console.error('❌ Student availability test failed:', error)
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
  return testStudentAvailability()
}).then(() => {
  console.log('✅ Student Availability test completed')
  // Uncomment the line below to test bulk lessons (requires valid instructor ID)
  // testBulkLessons()
}) 