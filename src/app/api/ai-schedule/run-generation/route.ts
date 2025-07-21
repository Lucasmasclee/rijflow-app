import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'

const DAY_ORDER = [
  { day: 'monday', name: 'Maandag', shortName: 'Ma' },
  { day: 'tuesday', name: 'Dinsdag', shortName: 'Di' },
  { day: 'wednesday', name: 'Woensdag', shortName: 'Wo' },
  { day: 'thursday', name: 'Donderdag', shortName: 'Do' },
  { day: 'friday', name: 'Vrijdag', shortName: 'Vr' },
  { day: 'saturday', name: 'Zaterdag', shortName: 'Za' },
  { day: 'sunday', name: 'Zondag', shortName: 'Zo' },
]

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
    lessons: any[];
    schedule_details: any;
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
    lessons: [], // Flattened lessons array for UI
    schedule_details: {
      lessen: 0,
      totale_minuten_tussen_lessen: 0
    },
    summary: {
      total_lessons: 0,
      total_students: data.leerlingen?.length || 0,
      week_dates: data.instructeur?.datums || []
    },
    metadata: {
      generated_at: new Date().toISOString(),
      input_data_summary: {
        instructor_available_days: Object.keys(data.instructeur?.beschikbareUren || {}),
        students_count: data.leerlingen?.length || 0
      }
    },
    debug_info: {
      instructor_data: data.instructeur,
      students_data: data.leerlingen,
      processing_steps: []
    }
  }

  // Add some basic lesson scheduling logic
  if (data.leerlingen && data.instructeur) {
    console.log('=== DEBUG: Processing students and instructor data ===')
    
    const students = data.leerlingen
    const instructor = data.instructeur
    
    console.log('Students count:', students.length)
    console.log('Instructor data:', JSON.stringify(instructor, null, 2))
    
    const availableDays = Object.keys(instructor.beschikbareUren || {})
    console.log('Available days:', availableDays)
    
    mockResult.debug_info.processing_steps.push(`Found ${students.length} students`)
    mockResult.debug_info.processing_steps.push(`Instructor available days: ${availableDays.join(', ')}`)
    
    let lessonCount = 0
    
    for (const student of students) {
      console.log(`=== DEBUG: Processing student ${student.naam} ===`)
      console.log('Student data:', JSON.stringify(student, null, 2))
      
      const lessonsNeeded = student.lessenPerWeek || 2
      console.log(`Lessons needed for this student: ${lessonsNeeded}`)
      
      mockResult.debug_info.processing_steps.push(`Student ${student.naam}: needs ${lessonsNeeded} lessons`)
      
      // Check if student has availability
      const studentAvailability = student.beschikbaarheid || {}
      const availableStudentDays = Object.keys(studentAvailability)
      console.log(`Student ${student.naam} available days:`, availableStudentDays)
      
      if (availableStudentDays.length === 0) {
        console.log(`Student ${student.naam} has no availability, skipping`)
        mockResult.debug_info.processing_steps.push(`Student ${student.naam} has no availability, skipping`)
        continue
      }
      
      for (let i = 0; i < lessonsNeeded && i < availableStudentDays.length; i++) {
        const day = availableStudentDays[i]
        console.log(`Checking day: ${day}`)
        
        // Check if instructor is available on this day
        const instructorDaySchedule = instructor.beschikbareUren[day]
        console.log(`Instructor schedule for ${day}:`, JSON.stringify(instructorDaySchedule, null, 2))
        
        if (!instructorDaySchedule || instructorDaySchedule.length < 2) {
          console.log(`Instructor not available on ${day}`)
          mockResult.debug_info.processing_steps.push(`Instructor not available on ${day}`)
          continue
        }
        
        // Check if student is available on this day
        const studentDaySchedule = studentAvailability[day]
        console.log(`Student schedule for ${day}:`, JSON.stringify(studentDaySchedule, null, 2))
        
        if (!studentDaySchedule || studentDaySchedule.length < 2) {
          console.log(`Student not available on ${day}`)
          mockResult.debug_info.processing_steps.push(`Student not available on ${day}`)
          continue
        }
        
        // Find overlapping time window
        // Convert instructor times from HH:MM:SS to HH:MM format to match student format
        const instructorStart = instructorDaySchedule[0].substring(0, 5) // Take only HH:MM part
        const instructorEnd = instructorDaySchedule[1].substring(0, 5) // Take only HH:MM part
        const studentStart = studentDaySchedule[0]
        const studentEnd = studentDaySchedule[1]
        
        console.log(`Instructor: ${instructorStart} - ${instructorEnd}`)
        console.log(`Student: ${studentStart} - ${studentEnd}`)
        
        // Simple overlap check (now both in HH:MM format)
        const overlapStart = instructorStart > studentStart ? instructorStart : studentStart
        const overlapEnd = instructorEnd < studentEnd ? instructorEnd : studentEnd
        
        if (overlapStart < overlapEnd) {
          const lessonDuration = student.lesDuur || 60
          
          // Add to week_planning
          const lessonData = {
            student: {
              id: student.id,
              name: student.naam
            },
            startTime: overlapStart,
            endTime: overlapEnd,
            duration: lessonDuration
          }
          
          mockResult.week_planning[day].push(lessonData)
          
          // Add to flattened lessons array for UI
          mockResult.lessons.push({
            studentName: student.naam,
            studentId: student.id,
            date: data.instructeur?.datums?.[DAY_ORDER.findIndex(d => d.name.toLowerCase() === day)] || new Date().toISOString().split('T')[0],
            startTime: overlapStart,
            endTime: overlapEnd,
            duration: lessonDuration,
            day: day
          })
          
          lessonCount++
          console.log(`Added lesson for ${student.naam} on ${day} at ${overlapStart}`)
          mockResult.debug_info.processing_steps.push(`Scheduled lesson for ${student.naam} on ${day} at ${overlapStart}`)
        } else {
          console.log(`No time overlap for ${student.naam} on ${day}`)
          mockResult.debug_info.processing_steps.push(`No time overlap for ${student.naam} on ${day}`)
        }
      }
    }
    
    mockResult.summary.total_lessons = lessonCount
    mockResult.schedule_details.lessen = lessonCount
    console.log(`=== DEBUG: Total lessons scheduled: ${lessonCount} ===`)
    mockResult.debug_info.processing_steps.push(`Total lessons scheduled: ${lessonCount}`)
  } else {
    console.log('=== DEBUG: Missing students or instructor data ===')
    console.log('Students:', data.leerlingen)
    console.log('Instructor:', data.instructeur)
    mockResult.debug_info.processing_steps.push('Missing students or instructor data')
  }

  console.log('=== DEBUG: Final result ===')
  console.log(JSON.stringify(mockResult, null, 2))
  
  return mockResult
} 