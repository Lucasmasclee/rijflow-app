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

      // Path to the JS script
      const scriptPath = path.join(process.cwd(), 'scripts', 'generate_week_planning.js')
      // Path where the JSON file should be created
      const jsonFilePath = path.join(process.cwd(), 'src', 'app', 'dashboard', 'ai-schedule', 'best_week_planning.json')

      console.log('Starting JS script:', scriptPath)
      console.log('JSON file will be created at:', jsonFilePath)
      console.log('Current working directory:', process.cwd())
      console.log('Script exists:', fs.existsSync(scriptPath))
      console.log('AI Settings:', settings)

      // Check if script exists
      if (!fs.existsSync(scriptPath)) {
        resolve(
          NextResponse.json(
            {
              error: 'JS script niet gevonden',
              details: `Script pad: ${scriptPath}`,
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

      console.log(`\n=== STARTING JS SCRIPT ===`)
      console.log(`Command: node`)
      console.log(`Script path: ${scriptPath}`)
      console.log(`Working directory: ${process.cwd()}`)
      console.log(`Environment variables:`, env)

      // --- NIEUW: sample_input.json initialiseren met databasewaarden ---
      // Commented out due to read-only filesystem in serverless environment
      // const sampleInputPath = path.join(process.cwd(), 'src', 'app', 'dashboard', 'ai-schedule', 'sample_input.json')
      // const tempSampleInputPath = path.join(process.cwd(), 'tmp', 'sample_input.json')
      
      // // Zorg dat de tmp directory bestaat
      // const tmpDir = path.dirname(tempSampleInputPath)
      // if (!fs.existsSync(tmpDir)) {
      //   fs.mkdirSync(tmpDir, { recursive: true })
      // }
      
      // let sampleInput = JSON.parse(fs.readFileSync(sampleInputPath, 'utf8'))
      // sampleInput.instructeur.pauzeTussenLessen = settings.pauze_tussen_lessen
      // sampleInput.instructeur.langePauzeDuur = settings.lange_pauze_duur
      // sampleInput.instructeur.locatiesKoppelen = settings.locaties_koppelen
      // sampleInput.instructeur.blokuren = settings.blokuren
      // fs.writeFileSync(tempSampleInputPath, JSON.stringify(sampleInput, null, 2), 'utf8')
      // --- EINDE NIEUW ---

      // Start the Node.js process
      const nodeProcess = spawn('node', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
        cwd: path.join(process.cwd(), 'src', 'app', 'dashboard', 'ai-schedule') // Set working directory to where sample_input.json is
      })

      let stdout = ''
      let stderr = ''

      nodeProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
        console.log('Node stdout:', data.toString())
      })

      nodeProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
        console.log('Node stderr:', data.toString())
      })

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.log('JS script timeout - killing process')
        nodeProcess.kill('SIGTERM')
        resolve(
          NextResponse.json(
            {
              error: 'JS script timeout',
              details: 'Het JS script heeft te lang geduurd om te voltooien',
              command: 'node',
              stdout: stdout,
              stderr: stderr
            },
            { status: 500 }
          )
        )
      }, 60000) // 60 second timeout

      nodeProcess.on('close', async (code: number | null) => {
        clearTimeout(timeout) // Clear timeout if process completes
        console.log('JS script finished with code:', code)
        console.log('Command used: node')
        console.log('Total stdout length:', stdout.length)
        console.log('Total stderr length:', stderr.length)
        
        if (code !== 0) {
          resolve(
            NextResponse.json(
              {
                error: 'Fout bij het genereren van het test rooster',
                details: stderr || `JS script exited with code ${code}`,
                command: 'node',
                stdout: stdout
              },
              { status: 500 }
            )
          )
          return
        }

        // Parse JSON from stdout - the script now outputs only JSON
        const jsonOutput = stdout.trim()
        
        try {
          if (!jsonOutput) {
            resolve(
              NextResponse.json(
                {
                  error: 'Geen JSON output gevonden in stdout',
                  details: 'Het script heeft geen geldige JSON output gegenereerd',
                  stdout: stdout.substring(0, 500) + '...', // Limit stdout in error
                  stderr: stderr,
                  command: 'node'
                },
                { status: 500 }
              )
            )
            return
          }
          
          console.log('JSON output from stdout length:', jsonOutput.length)
          console.log('JSON output preview:', jsonOutput.substring(0, 200) + '...')
          
          const aiResponse = JSON.parse(jsonOutput)
          console.log('Successfully parsed JSON response')
          
          resolve(NextResponse.json(aiResponse))
        } catch (parseError) {
          // Extra debugging: show first 20 lines of stdout and highlight line 8
          const stdoutLines = stdout.split('\n')
          let debugLines = stdoutLines.slice(0, 20).map((line, idx) => {
            if (idx === 7) {
              return '>>> ' + line + '   <<< (line 8)'
            }
            return line
          }).join('\n')
          console.error('JSON parse error:', parseError)
          console.error('JSON output that failed to parse:', jsonOutput || 'No JSON output found')
          resolve(
            NextResponse.json(
              {
                error: 'Fout bij het parsen van de JSON output',
                details: parseError instanceof Error ? parseError.message : 'Unknown parse error',
                stdout_preview: debugLines,
                stderr: stderr,
                command: 'node',
                suggestion: 'Let op: gebruik process.stdout.write(JSON.stringify(...)) in je script voor maximale zekerheid dat er geen extra newline na de JSON komt.'
              },
              { status: 500 }
            )
          )
        }
      })

      nodeProcess.on('error', (err: Error) => {
        clearTimeout(timeout) // Clear timeout on error
        console.error('Failed to start JS script:', err)
        console.error('Error details:', {
          message: err.message,
          code: (err as any).code,
          command: 'node',
          scriptPath: scriptPath
        })
        resolve(
          NextResponse.json(
            {
              error: 'Failed to start JS script',
              details: err.message,
              command: 'node',
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