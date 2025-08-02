import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import { SUBSCRIPTION_PLANS, calculateTrialEndDate } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { priceId, userId } = await request.json()

    if (!priceId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get user from Supabase
    const { data: user, error: userError } = await supabase.auth.getUser()
    if (userError || !user.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already has a subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.user.id)
      .single()

    let customerId = existingSubscription?.stripe_customer_id

    // Create or get Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.user.email!,
        metadata: {
          supabase_user_id: user.user.id,
        },
      })
      customerId = customer.id
    }

    // Determine the plan type
    const planType = priceId === SUBSCRIPTION_PLANS.monthly.id ? 'monthly' : 'yearly'

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/abonnement?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/abonnement?canceled=true`,
      subscription_data: {
        trial_period_days: 60, // 60 days trial
        metadata: {
          supabase_user_id: user.user.id,
          plan_type: planType,
        },
      },
      metadata: {
        supabase_user_id: user.user.id,
        plan_type: planType,
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 