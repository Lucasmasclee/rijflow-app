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
  // This is a simplified version that returns a basic structure
  // In a real implementation, you would port the logic from generate_week_planning.js
  // For now, we'll return a mock result to test the flow
  
  const mockResult: {
    week_planning: { [key: string]: any[] };
    summary: any;
    metadata: any;
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
    }
  }

  // Add some basic lesson scheduling logic
  if (data.studenten && data.instructeur) {
    const students = data.studenten
    const instructor = data.instructeur
    const availableDays = Object.keys(instructor.beschikbareUren || {})
    
    let lessonCount = 0
    
    for (const student of students) {
      const lessonsNeeded = student.lessons || 2
      
      for (let i = 0; i < lessonsNeeded && i < availableDays.length; i++) {
        const day = availableDays[i]
        const daySchedule = instructor.beschikbareUren[day]
        
        if (daySchedule && daySchedule.length > 0) {
          const timeSlot = daySchedule[0] // Use first available time slot
          
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
        }
      }
    }
    
    mockResult.summary.total_lessons = lessonCount
  }

  return mockResult
} 