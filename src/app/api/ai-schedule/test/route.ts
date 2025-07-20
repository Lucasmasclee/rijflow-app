import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting AI schedule generation...')
    
    // Get the path to the Python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_week_planning.py')
    console.log('Script path:', scriptPath)
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Python script not found at: ${scriptPath}`)
    }
    
    // Check if sample_input.json exists in scripts directory
    const inputPath = path.join(process.cwd(), 'scripts', 'sample_input.json')
    if (!fs.existsSync(inputPath)) {
      throw new Error(`sample_input.json not found at: ${inputPath}`)
    }
    
    // Spawn Python process
    const pythonProcess = spawn('python', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.join(process.cwd(), 'scripts') // Run from scripts directory
    })
    
    // Collect output
    let output = ''
    let errorOutput = ''
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
      console.log('Python stdout:', data.toString())
    })
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
      console.log('Python stderr:', data.toString())
    })
    
    // Wait for process to complete
    const result = await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code: ${code}`)
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Python script failed with code ${code}: ${errorOutput}`))
        }
      })
      
      pythonProcess.on('error', (error) => {
        console.log('Python process error:', error)
        reject(new Error(`Failed to start Python script: ${error.message}`))
      })
    })
    
    // Read the generated JSON file - try both possible filenames
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'app', 'dashboard', 'ai-schedule', 'best_week_planning.json'),
      path.join(process.cwd(), 'src', 'app', 'dashboard', 'ai-schedule', 'ai-weekplanning-testoutput.json')
    ]
    
    let jsonFilePath = null
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        jsonFilePath = filePath
        break
      }
    }
    
    console.log('Looking for JSON file at:', possiblePaths)
    
    if (!jsonFilePath) {
      throw new Error(`Generated JSON file not found at any of: ${possiblePaths.join(', ')}`)
    }
    
    const jsonData = fs.readFileSync(jsonFilePath, 'utf-8')
    console.log('JSON file content length:', jsonData.length)
    
    const aiResponse = JSON.parse(jsonData)
    console.log('Successfully parsed JSON response')
    
    return NextResponse.json(aiResponse)
    
  } catch (error) {
    console.error('Error in test AI schedule API:', error)
    return NextResponse.json(
      { 
        error: 'Fout bij het genereren van het test rooster',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 