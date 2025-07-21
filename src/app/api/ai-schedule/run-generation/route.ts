import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { editableInputPath, data } = body

    if (!editableInputPath && !data) {
      return NextResponse.json(
        { error: 'Either editable input path or data is required' },
        { status: 400 }
      )
    }

    let inputFilePath = editableInputPath

    // If data is provided directly, we need to handle it differently in serverless environment
    if (data) {
      // In serverless environment, we can't write to filesystem
      // So we'll process the data directly in memory
      try {
        const result = await processDataInMemory(data)
        return NextResponse.json({
          success: true,
          data: result
        })
      } catch (processingError) {
        console.error('Error processing data in memory:', processingError)
        return NextResponse.json(
          { error: 'Failed to process data: ' + (processingError instanceof Error ? processingError.message : 'Unknown error') },
          { status: 500 }
        )
      }
    } else {
      // Check if the editable input file exists
      const fullPath = path.join(process.cwd(), 'scripts', editableInputPath)
      if (!fs.existsSync(fullPath)) {
        return NextResponse.json(
          { error: 'Editable input file not found' },
          { status: 404 }
        )
      }
    }

    // Run the generate_week_planning.js script
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_week_planning.js')
    
    return new Promise<NextResponse>((resolve) => {
      exec(`node "${scriptPath}" "${inputFilePath}"`, {
        cwd: path.join(process.cwd(), 'scripts')
      }, (error, stdout, stderr) => {
        if (error) {
          console.error('Error running generation script:', error)
          console.error('stderr:', stderr)
          resolve(NextResponse.json(
            { error: 'Failed to run generation script', details: stderr },
            { status: 500 }
          ))
          return
        }

        // Check if the output file was created
        const outputPath = path.join(process.cwd(), 'scripts', 'best_week_planning.json')
        if (fs.existsSync(outputPath)) {
          try {
            const outputData = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
            resolve(NextResponse.json({
              success: true,
              data: outputData,
              stdout: stdout
            }))
          } catch (parseError) {
            console.error('Error parsing output file:', parseError)
            resolve(NextResponse.json(
              { error: 'Failed to parse output file' },
              { status: 500 }
            ))
          }
        } else {
          resolve(NextResponse.json(
            { error: 'Generation completed but no output file found' },
            { status: 500 }
          ))
        }
      })
    })

  } catch (error) {
    console.error('Error in run generation API:', error)
    return NextResponse.json(
      { error: 'Failed to run generation' },
      { status: 500 }
    )
  }
}

// Function to process data in memory (simplified version)
async function processDataInMemory(data: any) {
  console.log('=== DEBUG: Starting processDataInMemory ===')
  console.log('Input data structure:', JSON.stringify(data, null, 2))
  
  // This is a simplified version that returns a basic structure
  // In a real implementation, you would port the logic from generate_week_planning.js
  // For now, we'll return a mock result to test the flow
  
  const mockResult: {
    week_planning: { [key: string]: any[] };
    summary: any;
    metadata: any;
    debug_info: any;
  } = {
    week_planning: {
      maandag: [],
      dinsdag: [],
      woensdag: [],
      donderdag: [],
      vrijdag: [],
      zaterdag: [],
      zondag: []
    },
    summary: {
      total_lessons: 0,
      total_students: data.studenten?.length || 0,
      week_dates: data.instructeur?.datums || []
    },
    metadata: {
      generated_at: new Date().toISOString(),
      input_data_summary: {
        instructor_available_days: Object.keys(data.instructeur?.beschikbareUren || {}),
        students_count: data.studenten?.length || 0
      }
    },
    debug_info: {
      instructor_data: data.instructeur,
      students_data: data.studenten,
      processing_steps: []
    }
  }

  // Add some basic lesson scheduling logic
  if (data.studenten && data.instructeur) {
    console.log('=== DEBUG: Processing students and instructor data ===')
    
    const students = data.studenten
    const instructor = data.instructeur
    
    console.log('Students count:', students.length)
    console.log('Instructor data:', JSON.stringify(instructor, null, 2))
    
    const availableDays = Object.keys(instructor.beschikbareUren || {})
    console.log('Available days:', availableDays)
    
    mockResult.debug_info.processing_steps.push(`Found ${students.length} students`)
    mockResult.debug_info.processing_steps.push(`Instructor available days: ${availableDays.join(', ')}`)
    
    let lessonCount = 0
    
    for (const student of students) {
      console.log(`=== DEBUG: Processing student ${student.first_name} ${student.last_name || ''} ===`)
      console.log('Student data:', JSON.stringify(student, null, 2))
      
      const lessonsNeeded = student.lessons || 2
      console.log(`Lessons needed for this student: ${lessonsNeeded}`)
      
      mockResult.debug_info.processing_steps.push(`Student ${student.first_name}: needs ${lessonsNeeded} lessons`)
      
      for (let i = 0; i < lessonsNeeded && i < availableDays.length; i++) {
        const day = availableDays[i]
        console.log(`Checking day: ${day}`)
        
        const daySchedule = instructor.beschikbareUren[day]
        console.log(`Day schedule for ${day}:`, JSON.stringify(daySchedule, null, 2))
        
        if (daySchedule && daySchedule.length > 0) {
          const timeSlot = daySchedule[0] // Use first available time slot
          console.log(`Using time slot:`, JSON.stringify(timeSlot, null, 2))
          
          mockResult.week_planning[day].push({
            student: {
              id: student.id,
              name: `${student.first_name} ${student.last_name || ''}`.trim()
            },
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            duration: student.minutes || 60
          })
          
          lessonCount++
          console.log(`Added lesson for ${student.first_name} on ${day}`)
          mockResult.debug_info.processing_steps.push(`Scheduled lesson for ${student.first_name} on ${day} at ${timeSlot.startTime}`)
        } else {
          console.log(`No available time slots for ${day}`)
          mockResult.debug_info.processing_steps.push(`No time slots available for ${day}`)
        }
      }
    }
    
    mockResult.summary.total_lessons = lessonCount
    console.log(`=== DEBUG: Total lessons scheduled: ${lessonCount} ===`)
    mockResult.debug_info.processing_steps.push(`Total lessons scheduled: ${lessonCount}`)
  } else {
    console.log('=== DEBUG: Missing students or instructor data ===')
    console.log('Students:', data.studenten)
    console.log('Instructor:', data.instructeur)
    mockResult.debug_info.processing_steps.push('Missing students or instructor data')
  }

  console.log('=== DEBUG: Final result ===')
  console.log(JSON.stringify(mockResult, null, 2))
  
  return mockResult
} 