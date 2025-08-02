import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // Get all subscriptions for debugging
    const { data: allSubscriptions, error: allSubError } = await supabase
      .from('subscriptions')
      .select('*')
      .limit(10)

    return NextResponse.json({
      user: {
        id: user.user.id,
        email: user.user.email,
        metadata: user.user.user_metadata
      },
      subscription: subscription || null,
      subscriptionError: subError ? subError.message : null,
      allSubscriptions: allSubscriptions || [],
      allSubscriptionsError: allSubError ? allSubError.message : null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in debug subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 