import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export async function POST(request: NextRequest): Promise<Response> {
  return new Promise<Response>((resolve) => {
    // Pad naar het Python-script
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_week_planning.py')
    
    // Pad waar het JSON-bestand moet worden aangemaakt
    const jsonFilePath = path.join(process.cwd(), 'src', 'app', 'dashboard', 'ai-schedule', 'best_week_planning.json')

    console.log('Starting Python script:', scriptPath)
    console.log('JSON file will be created at:', jsonFilePath)

    // Probeer verschillende Python commando's (py eerst voor Windows)
    const pythonCommands = ['py', 'python3', 'python']
    let pythonProcess: any = null
    let commandUsed = ''

    for (const command of pythonCommands) {
      try {
        pythonProcess = spawn(command, [scriptPath])
        commandUsed = command
        console.log(`Successfully started Python script with command: ${command}`)
        break
      } catch (error) {
        console.log(`Command ${command} failed, trying next...`)
        continue
      }
    }

    if (!pythonProcess) {
      resolve(
        NextResponse.json(
          {
            error: 'Python niet gevonden',
            details: 'Geen van de Python commando\'s (python3, python, py) is beschikbaar op dit systeem',
          },
          { status: 500 }
        )
      )
      return
    }

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
      console.log('Python stdout:', data.toString())
    })

    pythonProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
      console.log('Python stderr:', data.toString())
    })

    pythonProcess.on('close', async (code: number | null) => {
      console.log('Python script finished with code:', code)
      
      if (code !== 0) {
        resolve(
          NextResponse.json(
            {
              error: 'Fout bij het genereren van het test rooster',
              details: stderr || `Python script exited with code ${code}`,
            },
            { status: 500 }
          )
        )
        return
      }

      // Wacht even om zeker te zijn dat het bestand is geschreven
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Controleer of het JSON-bestand bestaat
      if (!fs.existsSync(jsonFilePath)) {
        resolve(
          NextResponse.json(
            {
              error: 'JSON bestand niet gevonden na uitvoering Python script',
              details: `Verwacht bestand: ${jsonFilePath}`,
              stdout: stdout,
              stderr: stderr
            },
            { status: 500 }
          )
        )
        return
      }

      try {
        // Lees het JSON-bestand
        const jsonData = fs.readFileSync(jsonFilePath, 'utf-8')
        console.log('JSON file content length:', jsonData.length)
        
        const aiResponse = JSON.parse(jsonData)
        console.log('Successfully parsed JSON response')
        
        resolve(NextResponse.json(aiResponse))
      } catch (parseError) {
        resolve(
          NextResponse.json(
            {
              error: 'Fout bij het parsen van het JSON bestand',
              details: parseError instanceof Error ? parseError.message : 'Unknown parse error',
              filePath: jsonFilePath
            },
            { status: 500 }
          )
        )
      }
    })

    pythonProcess.on('error', (err: Error) => {
      console.error('Failed to start Python script:', err)
      resolve(
        NextResponse.json(
          {
            error: 'Failed to start Python script',
            details: err.message,
          },
          { status: 500 }
        )
      )
    })
  })
} 