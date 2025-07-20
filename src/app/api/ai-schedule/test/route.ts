import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

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
    
    // Read the generated JSON file
    const jsonFilePath = path.join(process.cwd(), 'src', 'app', 'dashboard', 'ai-schedule', 'best_week_planning.json')
    
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error('Generated JSON file not found')
    }
    
    const jsonData = fs.readFileSync(jsonFilePath, 'utf-8')
    const aiResponse = JSON.parse(jsonData)
    
    return NextResponse.json(aiResponse)
    
  } catch (error) {
    console.error('Error in test AI schedule API:', error)
    return NextResponse.json(
      { error: 'Fout bij het genereren van het test rooster' },
      { status: 500 }
    )
  }
} 