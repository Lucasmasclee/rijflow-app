import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.user.id)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new users
      console.error('Error fetching subscription:', subError)
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      )
    }

    // If no subscription exists, create a trial subscription
    if (!subscription) {
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 60) // 60 days trial

      const { data: newSubscription, error: createError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.user.id,
          subscription_status: 'trial',
          subscription_tier: 'free',
          trial_ends_at: trialEndDate.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating trial subscription:', createError)
        return NextResponse.json(
          { error: 'Failed to create trial subscription' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        subscription: newSubscription,
        isActive: true,
        isInTrial: true,
        trialDaysLeft: Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      })
    }

    // Check if subscription is active
    const isActive = hasActiveSubscription(subscription)
    const isInTrial = subscription.subscription_status === 'trial' && isInTrialPeriod(subscription.trial_ends_at)

    let trialDaysLeft = null
    if (isInTrial && subscription.trial_ends_at) {
      const trialEnd = new Date(subscription.trial_ends_at)
      trialDaysLeft = Math.ceil((trialEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }

    return NextResponse.json({
      subscription,
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