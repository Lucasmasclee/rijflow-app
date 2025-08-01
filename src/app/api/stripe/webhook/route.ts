import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import Stripe from 'stripe'

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
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

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.supabase_user_id
  
  if (!userId) {
    console.error('No supabase_user_id in subscription metadata')
    return
  }

  const trialEnd = subscription.trial_end 
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null

  // Access current_period_end using bracket notation to avoid TypeScript issues
  const currentPeriodEnd = (subscription as any).current_period_end
  const subscriptionEnd = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toISOString()
    : null

  await supabase
    .from('instructors')
    .update({
      subscription_status: subscription.status,
      subscription_id: subscription.id,
      trial_ends_at: trialEnd,
      subscription_ends_at: subscriptionEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  console.log(`Subscription created for user ${userId}: ${subscription.status}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.supabase_user_id
  
  if (!userId) {
    console.error('No supabase_user_id in subscription metadata')
    return
  }

  const trialEnd = subscription.trial_end 
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null

  // Access current_period_end using bracket notation to avoid TypeScript issues
  const currentPeriodEnd = (subscription as any).current_period_end
  const subscriptionEnd = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toISOString()
    : null

  await supabase
    .from('instructors')
    .update({
      subscription_status: subscription.status,
      trial_ends_at: trialEnd,
      subscription_ends_at: subscriptionEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  console.log(`Subscription updated for user ${userId}: ${subscription.status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.supabase_user_id
  
  if (!userId) {
    console.error('No supabase_user_id in subscription metadata')
    return
  }

  await supabase
    .from('instructors')
    .update({
      subscription_status: 'canceled',
      subscription_ends_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  console.log(`Subscription canceled for user ${userId}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Access subscription using bracket notation to avoid TypeScript issues
  const subscriptionId = (invoice as any).subscription

  if (!subscriptionId) {
    console.log('No subscription found in invoice')
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata.supabase_user_id
  
  if (!userId) {
    console.error('No supabase_user_id in subscription metadata')
    return
  }

  await supabase
    .from('instructors')
    .update({
      subscription_status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  console.log(`Payment succeeded for user ${userId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Access subscription using bracket notation to avoid TypeScript issues
  const subscriptionId = (invoice as any).subscription

  if (!subscriptionId) {
    console.log('No subscription found in invoice')
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata.supabase_user_id
  
  if (!userId) {
    console.error('No supabase_user_id in subscription metadata')
    return
  }

  await supabase
    .from('instructors')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  console.log(`Payment failed for user ${userId}`)
} 