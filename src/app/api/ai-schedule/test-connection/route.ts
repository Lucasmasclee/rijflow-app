import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET() {
  try {
    console.log('Testing connection...')
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('Environment variables check:')
    console.log('SUPABASE_URL exists:', !!supabaseUrl)
    console.log('SUPABASE_SERVICE_KEY exists:', !!supabaseServiceKey)
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Missing environment variables',
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey
      }, { status: 500 })
    }

    // Test Supabase connection
    const supabase = getSupabaseClient()
    console.log('Supabase client created successfully')
    
    // Test a simple query
    const { data, error } = await supabase
      .from('instructors')
      .select('id, first_name')
      .limit(1)
    
    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({
        error: 'Database connection failed',
        details: error.message
      }, { status: 500 })
    }
    
    console.log('Database connection successful')
    return NextResponse.json({
      success: true,
      message: 'Connection test successful',
      data: data
    })
    
  } catch (error) {
    console.error('Test connection error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 