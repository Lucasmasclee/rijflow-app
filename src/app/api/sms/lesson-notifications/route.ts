import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Twilio client setup
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_FROM_NUMBER
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
const senderName = process.env.TWILIO_SENDER_NAME || 'RijFlow'

// Helper function to determine the best sender to use
const getSenderId = () => {
  if (senderName && senderName !== 'RijFlow') {
    return senderName
  }
  if (fromNumber) {
    return fromNumber
  }
  return 'RijFlow'
}

interface LessonNotificationRequest {
  lessonIds: string[]
  sendImmediate: boolean
  sendReminder: boolean
}

interface LessonWithStudent {
  id: string
  date: string
  start_time: string
  end_time: string
  student: {
    id: string
    first_name: string
    last_name: string
    phone: string
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== LESSON SMS NOTIFICATIONS ROUTE STARTED ===')
    
    const { lessonIds, sendImmediate, sendReminder }: LessonNotificationRequest = await request.json()
    
    console.log('Request data:', {
      lessonIds,
      sendImmediate,
      sendReminder
    })

    // Debug: Log the lesson IDs in detail
    console.log('=== SMS API DEBUG ===')
    console.log('Received lesson IDs:', lessonIds)
    console.log('Lesson IDs type:', typeof lessonIds)
    console.log('Lesson IDs length:', lessonIds?.length || 0)
    console.log('First few lesson IDs:', lessonIds?.slice(0, 3))

    if (!accountSid || !authToken) {
      console.error('Twilio configuration missing:', { accountSid: !!accountSid, authToken: !!authToken })
      return NextResponse.json(
        { error: 'Twilio configuration missing' },
        { status: 500 }
      )
    }

    console.log('Twilio config OK')

    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization')
    console.log('Auth header present:', !!authHeader)
    
    let supabase
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use the provided JWT token for authentication
      const token = authHeader.replace('Bearer ', '')
      console.log('Using provided JWT token for authentication')
      
      const { createClient } = await import('@supabase/supabase-js')
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
    } else {
      // Fallback to cookie-based authentication
      console.log('No auth header provided, using cookie-based authentication')
      const cookieStore = await cookies()
      const { createServerClient } = await import('@supabase/ssr')
      supabase = createServerClient(
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
    }

    console.log('Supabase client created')

    // Debug: Verify authentication by getting the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('Current user from token:', user ? { id: user.id, email: user.email } : 'No user')
    console.log('User error:', userError)

    // Debug: Log the query we're about to make
    console.log('=== DATABASE QUERY DEBUG ===')
    console.log('Querying lessons with IDs:', lessonIds)
    console.log('Query filter:', { id: { in: lessonIds } })

    // Get lessons with student information
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select(`
        id,
        date,
        start_time,
        end_time,
        student:students(id, first_name, last_name, phone)
      `)
      .in('id', lessonIds)

    console.log('Lessons fetch result:', { 
      lessonsCount: lessons?.length || 0, 
      lessonsError,
      lessonIds 
    })
    
    // Debug: Log the actual lessons found
    if (lessons && lessons.length > 0) {
      console.log('Found lessons:', lessons.map((l: any) => ({ id: l.id, date: l.date, student: l.student?.first_name })))
    } else {
      console.log('No lessons found in database')
    }

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError)
      return NextResponse.json(
        { error: 'Failed to fetch lessons' },
        { status: 500 }
      )
    }

    if (!lessons || lessons.length === 0) {
      console.error('No lessons found for IDs:', lessonIds)
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
    
    console.log('Processing lessons for SMS notifications')

    for (const lesson of lessons) {
      // Type assertion with proper handling
      const lessonWithStudent = lesson as any
      console.log(`Processing lesson: ${lessonWithStudent.id} for student ${lessonWithStudent.student?.first_name}`)
      
      if (!lessonWithStudent.student?.phone) {
        console.log(`Student ${lessonWithStudent.student?.first_name} has no phone number`)
        results.push({
          lessonId: lessonWithStudent.id,
          success: false,
          error: 'No phone number'
        })
        continue
      }

      console.log(`Student ${lessonWithStudent.student?.first_name} phone: ${lessonWithStudent.student.phone}`)

      // Validate phone number (basic check)
      const phoneRegex = /^(\+31|0)6\d{8,9}$/
      if (!phoneRegex.test(lessonWithStudent.student.phone.replace(/\s/g, ''))) {
        console.log(`Student ${lessonWithStudent.student?.first_name} has invalid phone format: ${lessonWithStudent.student.phone}`)
        results.push({
          lessonId: lessonWithStudent.id,
          success: false,
          error: 'Invalid phone number format'
        })
        continue
      }

      // Format phone number for Twilio (convert to international format)
      let formattedPhone = lessonWithStudent.student.phone.replace(/\s/g, '')
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+31' + formattedPhone.substring(1)
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+31' + formattedPhone
      }
      
      console.log(`Student ${lessonWithStudent.student?.first_name} formatted phone: ${formattedPhone}`)

      // Format lesson date and time
      const lessonDate = new Date(lessonWithStudent.date)
      const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
      const dayName = dayNames[lessonDate.getDay()]
      
      const formattedDate = lessonDate.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: 'long'
      })

      const startTime = lessonWithStudent.start_time.substring(0, 5) // HH:MM format
      const endTime = lessonWithStudent.end_time.substring(0, 5) // HH:MM format

      const studentName = lessonWithStudent.student?.last_name 
        ? `${lessonWithStudent.student.first_name} ${lessonWithStudent.student.last_name}`
        : lessonWithStudent.student?.first_name

      // Send immediate notification if requested
      if (sendImmediate) {
        const immediateMessage = `Beste ${studentName}, er is een rijles ingepland op ${dayName} ${formattedDate} ${startTime} - ${endTime}`
        
        console.log(`Sending immediate SMS to ${lessonWithStudent.student?.first_name}: ${immediateMessage}`)

        try {
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
                Body: immediateMessage,
              }),
            }
          )

          const twilioResult = await twilioResponse.json()
          
          console.log(`Twilio immediate response for ${lessonWithStudent.student?.first_name}:`, { 
            status: twilioResponse.status, 
            ok: twilioResponse.ok, 
            result: twilioResult 
          })

          if (twilioResponse.ok && twilioResult.sid) {
            console.log(`Immediate SMS sent successfully to ${lessonWithStudent.student?.first_name}`)
            
            // Update sms_laatst_gestuurd timestamp
            const { error: updateError } = await supabase
              .from('students')
              .update({ sms_laatst_gestuurd: new Date().toISOString() })
              .eq('id', lessonWithStudent.student?.id)
            
            if (updateError) {
              console.error(`Error updating sms_laatst_gestuurd for ${lessonWithStudent.student?.first_name}:`, updateError)
            }

            results.push({
              lessonId: lessonWithStudent.id,
              success: true,
              type: 'immediate',
              messageSid: twilioResult.sid
            })
          } else {
            console.error(`Twilio immediate error for ${lessonWithStudent.student?.first_name}:`, twilioResult)
            results.push({
              lessonId: lessonWithStudent.id,
              success: false,
              type: 'immediate',
              error: twilioResult.message || 'Twilio API error'
            })
          }
        } catch (error) {
          console.error(`Network error sending immediate SMS to ${lessonWithStudent.student?.first_name}:`, error)
          results.push({
            lessonId: lessonWithStudent.id,
            success: false,
            type: 'immediate',
            error: 'Network error'
          })
        }
      }

      // Schedule reminder if requested
      if (sendReminder) {
        const reminderMessage = `Herinnering: Je hebt op ${dayName} ${formattedDate} ${startTime} - ${endTime} rijles`
        
        console.log(`Scheduling reminder SMS to ${lessonWithStudent.student?.first_name}: ${reminderMessage}`)

        // Calculate reminder time (24 hours before lesson)
        const lessonDateTime = new Date(`${lessonWithStudent.date}T${lessonWithStudent.start_time}`)
        const reminderDateTime = new Date(lessonDateTime.getTime() - (24 * 60 * 60 * 1000)) // 24 hours before

        // For now, we'll send the reminder immediately but log the intended timing
        // In a production environment, you'd want to use a proper scheduling system
        console.log(`Reminder should be sent at: ${reminderDateTime.toISOString()}`)

        try {
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
                Body: reminderMessage,
              }),
            }
          )

          const twilioResult = await twilioResponse.json()
          
          console.log(`Twilio reminder response for ${lessonWithStudent.student?.first_name}:`, { 
            status: twilioResponse.status, 
            ok: twilioResponse.ok, 
            result: twilioResult 
          })

          if (twilioResponse.ok && twilioResult.sid) {
            console.log(`Reminder SMS sent successfully to ${lessonWithStudent.student?.first_name}`)
            
            // Update sms_laatst_gestuurd timestamp
            const { error: updateError } = await supabase
              .from('students')
              .update({ sms_laatst_gestuurd: new Date().toISOString() })
              .eq('id', lessonWithStudent.student?.id)
            
            if (updateError) {
              console.error(`Error updating sms_laatst_gestuurd for ${lessonWithStudent.student?.first_name}:`, updateError)
            }

            results.push({
              lessonId: lessonWithStudent.id,
              success: true,
              type: 'reminder',
              messageSid: twilioResult.sid
            })
          } else {
            console.error(`Twilio reminder error for ${lessonWithStudent.student?.first_name}:`, twilioResult)
            results.push({
              lessonId: lessonWithStudent.id,
              success: false,
              type: 'reminder',
              error: twilioResult.message || 'Twilio API error'
            })
          }
        } catch (error) {
          console.error(`Network error sending reminder SMS to ${lessonWithStudent.student?.first_name}:`, error)
          results.push({
            lessonId: lessonWithStudent.id,
            success: false,
            type: 'reminder',
            error: 'Network error'
          })
        }
      }
    }

    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
    
    console.log('=== LESSON SMS NOTIFICATIONS ROUTE COMPLETED ===')
    console.log('Final results:', { results, summary })

    return NextResponse.json({
      success: true,
      results,
      summary
    })

  } catch (error) {
    console.error('Error in lesson SMS notifications route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 