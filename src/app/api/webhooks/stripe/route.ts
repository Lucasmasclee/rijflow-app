import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.client_reference_id) {
          // Get the plan ID from metadata
          const planId = session.metadata?.planId;
          
          // Update instructor's subscription status in the database
          const { error } = await supabase
            .from('instructors')
            .update({ 
              abonnement: planId || 'no_subscription',
              subscription_status: 'active',
              stripe_customer_id: session.customer as string,
              subscription_id: session.subscription as string
            })
            .eq('id', session.client_reference_id);

          if (error) {
            console.error('Error updating instructor subscription:', error);
          }
        }
        break;

      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        
        if (subscription.status === 'active') {
          // Get the plan ID from the subscription metadata or determine from price ID
          let planId = 'no_subscription';
          
          if (subscription.items.data.length > 0) {
            const priceId = subscription.items.data[0].price.id;
            
            // Map price IDs to plan IDs
            if (priceId === process.env.STRIPE_BASIC_MONTHLY_PRICE_ID) {
              planId = 'basic-monthly';
            } else if (priceId === process.env.STRIPE_BASIC_YEARLY_PRICE_ID) {
              planId = 'basic-yearly';
            } else if (priceId === process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID) {
              planId = 'premium-monthly';
            } else if (priceId === process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID) {
              planId = 'premium-yearly';
            }
          }
          
          // Update subscription status
          const { error } = await supabase
            .from('instructors')
            .update({ 
              abonnement: planId,
              subscription_status: 'active',
              subscription_id: subscription.id
            })
            .eq('stripe_customer_id', subscription.customer);

          if (error) {
            console.error('Error updating subscription status:', error);
          }
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          // Update subscription status to inactive
          const { error } = await supabase
            .from('instructors')
            .update({ 
              subscription_status: 'inactive'
            })
            .eq('stripe_customer_id', subscription.customer);

          if (error) {
            console.error('Error updating subscription status:', error);
          }
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        
        // Update subscription status to inactive
        const { error } = await supabase
          .from('instructors')
          .update({ 
            subscription_status: 'inactive'
          })
          .eq('stripe_customer_id', deletedSubscription.customer);

        if (error) {
          console.error('Error updating subscription status:', error);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
} 