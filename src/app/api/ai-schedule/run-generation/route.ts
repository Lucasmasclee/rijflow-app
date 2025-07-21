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

    // If data is provided directly, we need to write it to a temporary file first
    if (data) {
      // Write the data to a temporary input file
      const tempInputPath = path.join(process.cwd(), 'scripts', 'temp_input.json')
      try {
        fs.writeFileSync(tempInputPath, JSON.stringify(data, null, 2))
        inputFilePath = 'temp_input.json'
      } catch (writeError) {
        console.error('Error writing temp input file:', writeError)
        return NextResponse.json(
          { error: 'Failed to write input data to file' },
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
            
            // Clean up temporary input file if it was created
            if (data) {
              const tempInputPath = path.join(process.cwd(), 'scripts', 'temp_input.json')
              if (fs.existsSync(tempInputPath)) {
                fs.unlinkSync(tempInputPath)
              }
            }
            
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