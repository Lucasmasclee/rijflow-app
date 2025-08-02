import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get user from Supabase
    const { data: user, error: userError } = await supabase.auth.getUser()
    
    // Get session
    const { data: session, error: sessionError } = await supabase.auth.getSession()

    // Get instructor record
    const { data: instructor, error: instructorError } = await supabase
      .from('instructors')
      .select('*')
      .eq('id', user?.user?.id || '')
      .single()

    return NextResponse.json({
      user: user?.user || null,
      userError: userError?.message || null,
      session: session?.session || null,
      sessionError: sessionError?.message || null,
      instructor: instructor || null,
      instructorError: instructorError?.message || null,
      timestamp: new Date().toISOString(),
      cookies: request.headers.get('cookie') || 'No cookies'
    })

  } catch (error) {
    console.error('Error in debug auth:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 