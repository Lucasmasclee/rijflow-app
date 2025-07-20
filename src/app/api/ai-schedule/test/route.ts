import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Get the path to the Python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_week_planning.py')
    
    // Spawn Python process
    const pythonProcess = spawn('python', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    // Collect output
    let output = ''
    let errorOutput = ''
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })
    
    // Wait for process to complete
    const result = await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Python script failed with code ${code}: ${errorOutput}`))
        }
      })
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python script: ${error.message}`))
      })
    })
    
    // Parse the JSON output
    try {
      const aiResponse = JSON.parse(result as string)
      return NextResponse.json(aiResponse)
    } catch (parseError) {
      console.error('Error parsing Python script output:', parseError)
      return NextResponse.json(
        { error: 'Fout bij het parsen van de Python script output' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Error in test AI schedule API:', error)
    return NextResponse.json(
      { error: 'Fout bij het genereren van het test rooster' },
      { status: 500 }
    )
  }
} 