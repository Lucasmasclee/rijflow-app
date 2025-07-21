import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from('students')
      .select('count')
      .limit(1)

    if (testError) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: testError.message
      }, { status: 500 })
    }

    // Test file system access
    const fs = require('fs')
    const path = require('path')
    const scriptsPath = path.join(process.cwd(), 'scripts')
    
    let fileSystemStatus = 'unknown'
    try {
      if (fs.existsSync(scriptsPath)) {
        fileSystemStatus = 'scripts directory exists'
        
        // Try to read sample_input.json
        const sampleInputPath = path.join(scriptsPath, 'sample_input.json')
        if (fs.existsSync(sampleInputPath)) {
          fileSystemStatus = 'sample_input.json exists and readable'
        } else {
          fileSystemStatus = 'sample_input.json not found'
        }
      } else {
        fileSystemStatus = 'scripts directory not found'
      }
    } catch (fsError) {
      fileSystemStatus = `file system error: ${fsError instanceof Error ? fsError.message : 'Unknown error'}`
    }

    return NextResponse.json({
      success: true,
      database: 'connected',
      fileSystem: fileSystemStatus,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Test connection error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 