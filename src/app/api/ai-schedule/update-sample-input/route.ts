import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Path to the sample_input.json file
const SAMPLE_INPUT_PATH = path.join(process.cwd(), 'src', 'app', 'dashboard', 'ai-schedule', 'sample_input.json')

export async function POST(req: NextRequest) {
  // Simple auth check (placeholder)
  const auth = req.headers.get('authorization')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { field, value } = await req.json()
    if (!field) {
      return NextResponse.json({ error: 'Missing field' }, { status: 400 })
    }

    // Read the current sample_input.json
    const fileContent = fs.readFileSync(SAMPLE_INPUT_PATH, 'utf8')
    const data = JSON.parse(fileContent)

    // Only allow updating fields in instructeur
    if (!data.instructeur) {
      return NextResponse.json({ error: 'No instructeur object in sample_input.json' }, { status: 400 })
    }

    // Update the field
    data.instructeur[field] = value

    // Write back to file
    fs.writeFileSync(SAMPLE_INPUT_PATH, JSON.stringify(data, null, 2), 'utf8')

    return NextResponse.json({ success: true, data: data.instructeur })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
} 