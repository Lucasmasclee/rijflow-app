import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    
    const response: any = {
      environment: {
        supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
        supabaseAnonKey: supabaseAnonKey ? 'Set' : 'Missing',
      },
      auth: {
        hasAuthHeader: !!authHeader,
        startsWithBearer: authHeader?.startsWith('Bearer ') || false,
        tokenLength: authHeader ? authHeader.replace('Bearer ', '').length : 0
      }
    }
    
    // If we have a token, try to validate it
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        })
        
        const { data: { user }, error } = await supabase.auth.getUser()
        
        response.auth = {
          ...response.auth,
          user: user ? { id: user.id, email: user.email } : null,
          error: error?.message || null
        }
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error in test-env API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 