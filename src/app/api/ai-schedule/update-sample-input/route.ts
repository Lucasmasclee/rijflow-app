import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      pauzeTussenLessen, 
      langePauzeDuur, 
      locatiesKoppelen, 
      blokuren 
    } = body

    // Read the current sample_input.json file
    const filePath = path.join(process.cwd(), 'src/app/dashboard/ai-schedule/sample_input.json')
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'sample_input.json not found' }, { status: 404 })
    }

    const fileContent = fs.readFileSync(filePath, 'utf8')
    const sampleInput = JSON.parse(fileContent)

    // Update the instructeur section with new values
    if (pauzeTussenLessen !== undefined) {
      sampleInput.instructeur.pauzeTussenLessen = pauzeTussenLessen
    }
    
    if (langePauzeDuur !== undefined) {
      sampleInput.instructeur.langePauzeDuur = langePauzeDuur
    }
    
    if (locatiesKoppelen !== undefined) {
      sampleInput.instructeur.locatiesKoppelen = locatiesKoppelen
    }
    
    if (blokuren !== undefined) {
      sampleInput.instructeur.blokuren = blokuren
    }

    // Write the updated content back to the file
    fs.writeFileSync(filePath, JSON.stringify(sampleInput, null, 2), 'utf8')

    return NextResponse.json({ 
      success: true, 
      message: 'sample_input.json updated successfully',
      updatedValues: {
        pauzeTussenLessen: sampleInput.instructeur.pauzeTussenLessen,
        langePauzeDuur: sampleInput.instructeur.langePauzeDuur,
        locatiesKoppelen: sampleInput.instructeur.locatiesKoppelen,
        blokuren: sampleInput.instructeur.blokuren
      }
    })

  } catch (error) {
    console.error('Error updating sample_input.json:', error)
    return NextResponse.json({ 
      error: 'Failed to update sample_input.json',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 