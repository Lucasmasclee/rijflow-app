import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { hasActiveSubscription, isInTrialPeriod } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    // Get user from Supabase
    const { data: user, error: userError } = await supabase.auth.getUser()
    if (userError || !user.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's instructor record with subscription data
    const { data: instructor, error: instructorError } = await supabase
      .from('instructors')
      .select('*')
      .eq('id', user.user.id)
      .single()

    if (instructorError && instructorError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new users
      console.error('Error fetching instructor:', instructorError)
      return NextResponse.json(
        { error: 'Failed to fetch instructor' },
        { status: 500 }
      )
    }

    // If no instructor record exists, create one with trial subscription
    if (!instructor) {
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
          { error: 'Failed to create instructor with trial subscription' },
          { status: 500 }
        )
      }

      // Calculate trial days left from the created instructor
      const trialEnd = new Date(newInstructor.trial_ends_at)
      const trialDaysLeft = Math.ceil((trialEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

      return NextResponse.json({
        subscription: newInstructor,
        isActive: true,
        isInTrial: true,
        trialDaysLeft,
      })
    }

    // Check if subscription is active
    const isActive = hasActiveSubscription(instructor)
    const isInTrial = instructor.subscription_status === 'trial' && isInTrialPeriod(instructor.trial_ends_at)

    let trialDaysLeft = null
    if (isInTrial && instructor.trial_ends_at) {
      const trialEnd = new Date(instructor.trial_ends_at)
      trialDaysLeft = Math.ceil((trialEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }

    return NextResponse.json({
      subscription: instructor,
      isActive,
      isInTrial,
      trialDaysLeft,
    })
  } catch (error) {
    console.error('Error getting subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 