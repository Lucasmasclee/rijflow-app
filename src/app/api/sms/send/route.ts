import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Twilio client setup
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_FROM_NUMBER
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID // Messaging Service SID
const senderName = process.env.TWILIO_SENDER_NAME || 'RijFlow' // Custom sender name

// Helper function to determine the best sender to use
const getSenderId = () => {
  // If we have a custom sender name, use it
  if (senderName && senderName !== 'RijFlow') {
    return senderName
  }
  // Fallback to phone number if available
  if (fromNumber) {
    return fromNumber
  }
  // Final fallback
  return 'RijFlow'
}

interface SMSRequest {
  studentIds: string[]
  weekStart: string
  weekEnd: string
  weekStartFormatted: string
  weekEndFormatted: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== SMS SEND ROUTE STARTED ===')
    
    const { studentIds, weekStart, weekEnd, weekStartFormatted, weekEndFormatted }: SMSRequest = await request.json()
    
    console.log('Request data:', {
      studentIds,
      weekStart,
      weekEnd,
      weekStartFormatted,
      weekEndFormatted
    })

    if (!accountSid || !authToken) {
      console.error('Twilio configuration missing:', { accountSid: !!accountSid, authToken: !!authToken })
      return NextResponse.json(
        { error: 'Twilio configuration missing' },
        { status: 500 }
      )
    }

    console.log('Twilio config OK')

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

    console.log('Supabase client created')

    // DEBUG: Check if availability_links table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('availability_links')
      .select('count')
      .limit(1)
    
    console.log('Availability links table check:', { tableCheck, tableError })

    // DEBUG: Check if create_availability_link function exists
    try {
      const { data: functionTest, error: functionError } = await supabase
        .rpc('create_availability_link', {
          p_student_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
          p_week_start: '2025-01-01'
        })
      console.log('create_availability_link function test:', { functionTest, functionError })
    } catch (error) {
      console.error('create_availability_link function error:', error)
    }

    // Get students data
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, first_name, last_name, phone, public_url')
      .in('id', studentIds)

    console.log('Students fetch result:', { 
      studentsCount: students?.length || 0, 
      studentsError,
      studentIds 
    })

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }

    if (!students || students.length === 0) {
      console.error('No students found for IDs:', studentIds)
      return NextResponse.json({
        success: true,
        results: [],
        summary: {
          total: 0,
          successful: 0,
          failed: 0
        }
      })
    }

    const results = []
    
    // Use the formatted dates from the students page
    const weekText = `${weekStartFormatted} - ${weekEndFormatted}`
    
    console.log('Processing students for week:', weekText)

    for (const student of students) {
      console.log(`Processing student: ${student.first_name} ${student.last_name} (${student.id})`)
      
      if (!student.phone) {
        console.log(`Student ${student.first_name} has no phone number`)
        results.push({
          studentId: student.id,
          success: false,
          error: 'No phone number'
        })
        continue
      }

      console.log(`Student ${student.first_name} phone: ${student.phone}`)

      // Validate phone number (basic check)
      const phoneRegex = /^(\+31|0)6\d{8,9}$/
      if (!phoneRegex.test(student.phone.replace(/\s/g, ''))) {
        console.log(`Student ${student.first_name} has invalid phone format: ${student.phone}`)
        results.push({
          studentId: student.id,
          success: false,
          error: 'Invalid phone number format'
        })
        continue
      }

      // Format phone number for Twilio (convert to international format)
      let formattedPhone = student.phone.replace(/\s/g, '')
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+31' + formattedPhone.substring(1)
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+31' + formattedPhone
      }
      
      console.log(`Student ${student.first_name} formatted phone: ${formattedPhone}`)

      // DEBUG: Check existing availability links for this student
      const { data: existingLinks, error: linksError } = await supabase
        .from('availability_links')
        .select('*')
        .eq('student_id', student.id)
        .eq('week_start', weekStart)
      
      console.log(`Existing links for ${student.first_name}:`, { existingLinks, linksError })

      // Generate week-specific availability link
      console.log(`Creating availability link for ${student.first_name} for week ${weekStart}`)
      
      let linkData: string | null = null;
      try {
        const { data, error: linkError } = await supabase
          .rpc('create_availability_link', {
            p_student_id: student.id,
            p_week_start: weekStart
          })

        linkData = data;
        console.log(`Link creation result for ${student.first_name}:`, { linkData, linkError })

        if (linkError) {
          console.error('Error creating availability link:', linkError)
          results.push({
            studentId: student.id,
            success: false,
            error: `Failed to create availability link: ${linkError.message}`
          })
          continue
        }

        if (!linkData) {
          console.error('No link data returned for student:', student.first_name)
          results.push({
            studentId: student.id,
            success: false,
            error: 'No availability link generated'
          })
          continue
        }
      } catch (error) {
        console.error('Exception creating availability link for student:', student.first_name, error)
        results.push({
          studentId: student.id,
          success: false,
          error: `Exception creating availability link: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
        continue
      }

      // Create the full URL for the availability link
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://rijflow.nl'
      const availabilityUrl = `${baseUrl}/beschikbaarheid/${linkData}`
      
      console.log(`Availability URL for ${student.first_name}: ${availabilityUrl}`)

      // Create personalized message
      const studentName = student.last_name 
        ? `${student.first_name} ${student.last_name}`
        : student.first_name

      const message = `Beste ${studentName}, vul je beschikbaarheid in voor ${weekText} met deze link: ${availabilityUrl}`
      
      console.log(`SMS message for ${student.first_name}: ${message}`)

      try {
        console.log(`Sending SMS to ${student.first_name} via Twilio...`)
        
        // Send SMS via Twilio
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              MessagingServiceSid: messagingServiceSid || '',
              To: formattedPhone,
              Body: message,
            }),
          }
        )

        const twilioResult = await twilioResponse.json()
        
        console.log(`Twilio response for ${student.first_name}:`, { 
          status: twilioResponse.status, 
          ok: twilioResponse.ok, 
          result: twilioResult 
        })

        if (twilioResponse.ok && twilioResult.sid) {
          console.log(`SMS sent successfully to ${student.first_name}`)
          
          // Update sms_laatst_gestuurd timestamp
          const { error: updateError } = await supabase
            .from('students')
            .update({ sms_laatst_gestuurd: new Date().toISOString() })
            .eq('id', student.id)
          
          if (updateError) {
            console.error(`Error updating sms_laatst_gestuurd for ${student.first_name}:`, updateError)
          }

          results.push({
            studentId: student.id,
            success: true,
            messageSid: twilioResult.sid
          })
        } else {
          console.error(`Twilio error for ${student.first_name}:`, twilioResult)
          results.push({
            studentId: student.id,
            success: false,
            error: twilioResult.message || 'Twilio API error'
          })
        }
      } catch (error) {
        console.error(`Network error sending SMS to ${student.first_name}:`, error)
        results.push({
          studentId: student.id,
          success: false,
          error: 'Network error'
        })
      }
    }

    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
    
    console.log('=== SMS SEND ROUTE COMPLETED ===')
    console.log('Final results:', { results, summary })

    return NextResponse.json({
      success: true,
      results,
      summary
    })

  } catch (error) {
    console.error('Error in SMS send route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 