import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionChange(subscription: any) {
  const userId = subscription.metadata?.supabase_user_id
  if (!userId) {
    console.error('No user ID found in subscription metadata')
    return
  }

  const planType = subscription.metadata?.plan_type || 'monthly'
  const status = subscription.status
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
  const currentPeriodStart = subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null
  const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null

  // Determine subscription status
  let subscriptionStatus = status
  if (status === 'trialing' && trialEnd) {
    subscriptionStatus = 'trial'
  }

  // Upsert subscription record
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      subscription_status: subscriptionStatus,
      subscription_tier: planType,
      trial_ends_at: trialEnd,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('Error updating subscription in Supabase:', error)
    throw error
  }

  console.log(`Subscription ${subscription.id} updated for user ${userId}`)
}

async function handlePaymentSucceeded(invoice: any) {
  const subscription = invoice.subscription
  if (subscription) {
    await handleSubscriptionChange(subscription)
  }
}

async function handlePaymentFailed(invoice: any) {
  const subscription = invoice.subscription
  if (subscription) {
    // Update subscription status to past_due
    const userId = subscription.metadata?.supabase_user_id
    if (userId) {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          subscription_status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating subscription status to past_due:', error)
      }
    }
  }
} 