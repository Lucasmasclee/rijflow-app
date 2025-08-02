import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Get user from Supabase
    const { data: user, error: userError } = await supabase.auth.getUser()
    if (userError || !user.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if instructor record already exists
    const { data: existingInstructor, error: checkError } = await supabase
      .from('instructors')
      .select('*')
      .eq('id', user.user.id)
      .single()

    if (existingInstructor) {
      return NextResponse.json({
        message: 'Instructor record already exists',
        subscription: existingInstructor
      })
    }

    // Create instructor record with trial subscription
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 60) // 60 days trial

    const { data: newInstructor, error: createError } = await supabase
      .from('instructors')
      .insert({
        id: user.user.id,
        email: user.user.email || '',
        rijschoolnaam: 'Mijn Rijschool',
        subscription_status: 'trial',
        trial_ends_at: trialEndDate.toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating instructor with trial subscription:', createError)
      return NextResponse.json(
        { error: 'Failed to create instructor with trial subscription: ' + createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Instructor record with trial subscription created successfully',
      subscription: newInstructor
    })

  } catch (error) {
    console.error('Error creating trial subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 