import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to check if a command exists
async function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`Testing command: ${command}`)
    
    const testProcess = spawn(command, ['--version'], { 
      stdio: 'pipe',
      shell: true 
    })
    
    let stdout = ''
    let stderr = ''
    
    testProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    testProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    testProcess.on('close', (code) => {
      console.log(`Command ${command} result:`, { code, stdout: stdout.trim(), stderr: stderr.trim() })
      resolve(code === 0)
    })
    
    testProcess.on('error', (err) => {
      console.log(`Command ${command} error:`, err.message)
      resolve(false)
    })
    
    // Timeout after 5 seconds
    setTimeout(() => {
      console.log(`Command ${command} timeout`)
      testProcess.kill()
      resolve(false)
    }, 5000)
  })
}

// Helper function to try running a command directly
async function tryRunCommand(command: string, args: string[]): Promise<{ success: boolean, output: string, error: string }> {
  return new Promise((resolve) => {
    console.log(`Trying to run: ${command} ${args.join(' ')}`)
    
    const childProcess = spawn(command, args, { 
      stdio: 'pipe',
      shell: true,
      cwd: process.cwd()
    })
    
    let stdout = ''
    let stderr = ''
    
    childProcess.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })
    
    childProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })
    
    childProcess.on('close', (code: number | null) => {
      console.log(`Command finished with code: ${code}`)
      resolve({
        success: code === 0,
        output: stdout,
        error: stderr
      })
    })
    
    childProcess.on('error', (err: Error) => {
      console.log(`Command error:`, err.message)
      resolve({
        success: false,
        output: '',
        error: err.message
      })
    })
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.log(`Command timeout`)
      childProcess.kill()
      resolve({
        success: false,
        output: '',
        error: 'Timeout'
      })
    }, 10000)
  })
}

export async function POST(request: NextRequest): Promise<Response> {
  return new Promise<Response>(async (resolve) => {
    try {
      // Get the authorization header from the request
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        resolve(NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 }))
        return
      }

      const token = authHeader.replace('Bearer ', '')
      
      // Verify the token and get user info
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        console.error('Auth error:', authError)
        resolve(NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 }))
        return
      }

      console.log('Authenticated user:', user.id)

      // Get AI settings for the current user
      const { data: aiSettings, error: settingsError } = await supabase
        .from('instructor_ai_settings')
        .select('*')
        .eq('instructor_id', user.id)
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
      console.log('Script exists:', fs.existsSync(scriptPath))
      console.log('AI Settings:', settings)

      // Check if script exists
      if (!fs.existsSync(scriptPath)) {
        resolve(
          NextResponse.json(
            {
              error: 'Python script niet gevonden',
              details: `Script pad: ${scriptPath}`,
            },
            { status: 500 }
          )
        )
        return
      }

      // Probeer verschillende Python commando's in volgorde van voorkeur
      const pythonCommands = ['python3', 'python', 'py', 'python3.9', 'python3.8', 'python3.7']
      let commandUsed = ''

      console.log('=== PYTHON COMMAND DETECTION ===')
      console.log('Current working directory:', process.cwd())
      console.log('Platform:', process.platform)
      console.log('Architecture:', process.arch)
      console.log('Node version:', process.version)

      // First, try to find which Python command is available
      for (const command of pythonCommands) {
        console.log(`\nTesting Python command: ${command}`)
        const exists = await commandExists(command)
        if (exists) {
          console.log(`✅ Found working Python command: ${command}`)
          commandUsed = command
          break
        } else {
          console.log(`❌ Command ${command} not found or failed`)
        }
      }

      if (!commandUsed) {
        console.log('\n=== PYTHON DETECTION FAILED ===')
        console.log('Trying to check PATH environment...')
        
        // Try to run 'which python3' or 'where python' to see what's available
        const pathCheck = process.platform === 'win32' ? 'where python' : 'which python3'
        const pathResult = await tryRunCommand('sh', ['-c', pathCheck])
        console.log('PATH check result:', pathResult)
        
        resolve(
          NextResponse.json(
            {
              error: 'Python niet gevonden',
              details: `Geen van de Python commando's (${pythonCommands.join(', ')}) is beschikbaar op dit systeem. Platform: ${process.platform}, PATH check: ${pathResult.output}`,
              debug: {
                platform: process.platform,
                arch: process.arch,
                cwd: process.cwd(),
                pathCheck: pathResult
              }
            },
            { status: 500 }
          )
        )
        return
      }

      // Pass AI settings as environment variables
      const env = {
        ...process.env,
        PAUZE_TUSSEN_LESSEN: settings.pauze_tussen_lessen.toString(),
        LANGE_PAUZE_DUUR: settings.lange_pauze_duur.toString(),
        LOCATIES_KOPPELEN: settings.locaties_koppelen.toString(),
        BLOKUREN: settings.blokuren.toString()
      }

      console.log(`\n=== STARTING PYTHON SCRIPT ===`)
      console.log(`Command: ${commandUsed}`)
      console.log(`Script path: ${scriptPath}`)
      console.log(`Working directory: ${process.cwd()}`)
      console.log(`Environment variables:`, env)

      // Start the Python process
      const pythonProcess = spawn(commandUsed, [scriptPath], { 
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
        cwd: process.cwd() // Explicitly set working directory
      })

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

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.log('Python script timeout - killing process')
        pythonProcess.kill('SIGTERM')
        resolve(
          NextResponse.json(
            {
              error: 'Python script timeout',
              details: 'Het Python script heeft te lang geduurd om te voltooien',
              command: commandUsed,
              stdout: stdout,
              stderr: stderr
            },
            { status: 500 }
          )
        )
      }, 60000) // 60 second timeout

      pythonProcess.on('close', async (code: number | null) => {
        clearTimeout(timeout) // Clear timeout if process completes
        console.log('Python script finished with code:', code)
        console.log('Command used:', commandUsed)
        console.log('Total stdout length:', stdout.length)
        console.log('Total stderr length:', stderr.length)
        
        if (code !== 0) {
          resolve(
            NextResponse.json(
              {
                error: 'Fout bij het genereren van het test rooster',
                details: stderr || `Python script exited with code ${code}`,
                command: commandUsed,
                stdout: stdout
              },
              { status: 500 }
            )
          )
          return
        }

        // Wacht even om zeker te zijn dat het bestand is geschreven
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Controleer of het JSON-bestand bestaat
        if (!fs.existsSync(jsonFilePath)) {
          resolve(
            NextResponse.json(
              {
                error: 'JSON bestand niet gevonden na uitvoering Python script',
                details: `Verwacht bestand: ${jsonFilePath}`,
                stdout: stdout,
                stderr: stderr,
                command: commandUsed
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
                filePath: jsonFilePath,
                command: commandUsed
              },
              { status: 500 }
            )
          )
        }
      })

      pythonProcess.on('error', (err: Error) => {
        clearTimeout(timeout) // Clear timeout on error
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