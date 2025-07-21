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

    // If data is provided directly, create a temporary file
    if (data) {
      const timestamp = Date.now()
      inputFilePath = `temp_input_${timestamp}.json`
      const tempFilePath = path.join(process.cwd(), 'scripts', inputFilePath)
      
      try {
        // Ensure the scripts directory exists
        const scriptsDir = path.join(process.cwd(), 'scripts')
        if (!fs.existsSync(scriptsDir)) {
          fs.mkdirSync(scriptsDir, { recursive: true })
        }
        
        fs.writeFileSync(tempFilePath, JSON.stringify(data, null, 2))
      } catch (fileError) {
        console.error('Error writing temporary file:', fileError)
        const errorMessage = fileError instanceof Error ? fileError.message : 'Unknown error'
        return NextResponse.json(
          { error: 'Failed to create temporary input file: ' + errorMessage },
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
            
            // Clean up temporary file if it was created
            if (data && inputFilePath !== editableInputPath) {
              try {
                const tempFilePath = path.join(process.cwd(), 'scripts', inputFilePath)
                if (fs.existsSync(tempFilePath)) {
                  fs.unlinkSync(tempFilePath)
                }
              } catch (cleanupError) {
                console.warn('Failed to cleanup temporary file:', cleanupError)
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