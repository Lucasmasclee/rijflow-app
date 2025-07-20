import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest): Promise<Response> {
  return new Promise<Response>(async (resolve) => {
    try {
      // Get AI settings from database
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        resolve(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
        return
      }

      // Get AI settings for the current user
      const { data: aiSettings, error: settingsError } = await supabase
        .from('instructor_ai_settings')
        .select('*')
        .eq('instructor_id', session.user.id)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching AI settings:', settingsError)
        resolve(NextResponse.json({ 
          error: 'Failed to fetch AI settings',
          details: settingsError.message
        }, { status: 500 }))
        return
      }

      // Use default settings if none exist
      const settings = aiSettings || {
        pauze_tussen_lessen: 5,
        lange_pauze_duur: 0,
        locaties_koppelen: true,
        blokuren: true
      }

      // Pad naar het Python-script
      const scriptPath = path.join(process.cwd(), 'scripts', 'generate_week_planning.py')
      
      // Pad waar het JSON-bestand moet worden aangemaakt
      const jsonFilePath = path.join(process.cwd(), 'src', 'app', 'dashboard', 'ai-schedule', 'best_week_planning.json')

      console.log('Starting Python script:', scriptPath)
      console.log('JSON file will be created at:', jsonFilePath)
      console.log('Current working directory:', process.cwd())
      console.log('Script exists:', require('fs').existsSync(scriptPath))
      console.log('AI Settings:', settings)

      // Probeer verschillende Python commando's (py eerst voor Windows)
      const pythonCommands = ['py', 'python3', 'python']
      let pythonProcess: any = null
      let commandUsed = ''

      for (const command of pythonCommands) {
        try {
          // Pass AI settings as environment variables
          const env = {
            ...process.env,
            PAUZE_TUSSEN_LESSEN: settings.pauze_tussen_lessen.toString(),
            LANGE_PAUZE_DUUR: settings.lange_pauze_duur.toString(),
            LOCATIES_KOPPELEN: settings.locaties_koppelen.toString(),
            BLOKUREN: settings.blokuren.toString()
          }

          // Use shell: true to ensure the command is found in PATH
          pythonProcess = spawn(command, [scriptPath], { 
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            env
          })
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
        console.error('Error details:', {
          message: err.message,
          code: (err as any).code,
          command: commandUsed,
          scriptPath: scriptPath
        })
        resolve(
          NextResponse.json(
            {
              error: 'Failed to start Python script',
              details: err.message,
              command: commandUsed,
              code: (err as any).code
            },
            { status: 500 }
          )
        )
      })

    } catch (error) {
      console.error('Error in test route:', error)
      resolve(
        NextResponse.json(
          {
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      )
    }
  })
} 