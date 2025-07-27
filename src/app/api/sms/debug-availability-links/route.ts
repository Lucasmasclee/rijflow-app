import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG AVAILABILITY LINKS STARTED ===')

    // Create authenticated Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Get URL parameters
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const weekStart = searchParams.get('weekStart')
    const token = searchParams.get('token') // New parameter for specific token check

    console.log('Debug parameters:', { studentId, weekStart, token })

    // Check if availability_links table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('availability_links')
      .select('count')
      .limit(1)
    
    console.log('Table check:', { tableCheck, tableError })

    // Get all students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, first_name, last_name, phone')
      .order('first_name', { ascending: true })

    console.log('Students fetch:', { studentsCount: students?.length || 0, studentsError })

    // Get all availability links
    const { data: allLinks, error: linksError } = await supabase
      .from('availability_links')
      .select('*')
      .order('week_start')

    console.log('All links fetch:', { linksCount: allLinks?.length || 0, linksError })

    // If specific token provided, check that token
    let specificTokenCheck = null
    if (token) {
      const { data: tokenData, error: tokenError } = await supabase
        .from('availability_links')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name
          )
        `)
        .eq('token', token)
        .single()

      console.log('Specific token check:', { tokenData, tokenError })
      specificTokenCheck = { tokenData, tokenError }
    }

    // If specific student and week provided, check that combination
    let specificLink = null
    if (studentId && weekStart) {
      const { data: specificLinkData, error: specificLinkError } = await supabase
        .from('availability_links')
        .select('*')
        .eq('student_id', studentId)
        .eq('week_start', weekStart)
        .single()

      console.log('Specific link check:', { specificLinkData, specificLinkError })
      specificLink = specificLinkData
    }

    // Test create_availability_link function
    let functionTest = null
    try {
      const { data: functionTestData, error: functionTestError } = await supabase
        .rpc('create_availability_link', {
          p_student_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
          p_week_start: '2025-01-01'
        })
      functionTest = { data: functionTestData, error: functionTestError }
      console.log('Function test:', functionTest)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      functionTest = { error: errorMessage }
      console.error('Function test error:', error)
    }

    // Calculate next 8 weeks
    const today = new Date()
    const next8Weeks = []
    for (let i = 1; i <= 8; i++) {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() + (i * 7))
      // Get Monday of that week
      const day = weekStart.getDay()
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
      weekStart.setDate(diff)
      weekStart.setHours(0, 0, 0, 0)
      next8Weeks.push(weekStart.toISOString().split('T')[0])
    }

    console.log('Next 8 weeks:', next8Weeks)

    // Check which students have links for which weeks
    const studentWeekStatus = []
    if (students && allLinks) {
      for (const student of students) {
        const studentLinks = allLinks.filter(link => link.student_id === student.id)
        const weekStatus: Record<string, boolean> = {}
        
        for (const week of next8Weeks) {
          weekStatus[week] = studentLinks.some(link => link.week_start === week)
        }
        
        studentWeekStatus.push({
          student: {
            id: student.id,
            name: `${student.first_name} ${student.last_name || ''}`.trim(),
            phone: student.phone
          },
          totalLinks: studentLinks.length,
          weekStatus
        })
      }
    }

    const debugInfo = {
      tableExists: !tableError,
      tableError: tableError?.message,
      studentsCount: students?.length || 0,
      studentsError: studentsError?.message,
      linksCount: allLinks?.length || 0,
      linksError: linksError?.message,
      functionTest,
      specificLink,
      specificTokenCheck,
      next8Weeks,
      studentWeekStatus
    }

    console.log('=== DEBUG AVAILABILITY LINKS COMPLETED ===')
    console.log('Debug info:', debugInfo)

    return NextResponse.json({
      success: true,
      debugInfo
    })

  } catch (error: unknown) {
    console.error('Error in debug availability links route:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
} 