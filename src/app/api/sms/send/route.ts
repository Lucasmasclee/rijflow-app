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
}

export async function POST(request: NextRequest) {
  try {
    const { studentIds, weekStart, weekEnd }: SMSRequest = await request.json()

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Twilio configuration missing' },
        { status: 500 }
      )
    }

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

    // Get students data
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, first_name, last_name, phone, public_url')
      .in('id', studentIds)

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }

    const results = []
    
    // Format dates exactly like in the students page UI
    // Use the same date calculation logic as the students page to avoid timezone issues
    const formatDateForSMS = (dateString: string, isEndDate: boolean = false) => {
      // Parse the date string and create a local date to avoid timezone issues
      const [year, month, day] = dateString.split('-').map(Number)
      const date = new Date(year, month - 1, day) // month is 0-indexed in Date constructor
      return date.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: 'long',
        ...(isEndDate && { year: 'numeric' })
      })
    }
    
    const weekText = `${formatDateForSMS(weekStart)} - ${formatDateForSMS(weekEnd, true)}`

    for (const student of students || []) {
      if (!student.phone) {
        results.push({
          studentId: student.id,
          success: false,
          error: 'No phone number'
        })
        continue
      }

      // Validate phone number (basic check)
      const phoneRegex = /^(\+31|0)6\d{8,9}$/
      if (!phoneRegex.test(student.phone.replace(/\s/g, ''))) {
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

      // Create personalized message
      const studentName = student.last_name 
        ? `${student.first_name} ${student.last_name}`
        : student.first_name

      const message = `Beste ${studentName}, vul je beschikbaarheid in voor ${weekText} met deze link: ${student.public_url}`

      try {
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

        if (twilioResponse.ok && twilioResult.sid) {
          // Update sms_laatst_gestuurd timestamp
          await supabase
            .from('students')
            .update({ sms_laatst_gestuurd: new Date().toISOString() })
            .eq('id', student.id)

          results.push({
            studentId: student.id,
            success: true,
            messageSid: twilioResult.sid
          })
        } else {
          results.push({
            studentId: student.id,
            success: false,
            error: twilioResult.message || 'Twilio API error'
          })
        }
      } catch (error) {
        console.error('Error sending SMS to student:', student.id, error)
        results.push({
          studentId: student.id,
          success: false,
          error: 'Network error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    })

  } catch (error) {
    console.error('Error in SMS send route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 