import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Test endpoint to check if webhook is reachable
export async function GET() {
  return NextResponse.json({ 
    status: 'Webhook endpoint is reachable',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  console.log('🔔 Stripe webhook received');
  console.log('🔔 Request headers:', Object.fromEntries(request.headers.entries()));
  
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  console.log('🔔 Body length:', body.length);
  console.log('🔔 Signature present:', !!signature);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('🔔 Webhook signature verified successfully');
    console.log('🔔 Event type:', event.type);
    console.log('🔔 Event ID:', event.id);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Check if supabaseAdmin is available
  if (!supabaseAdmin) {
    console.error('❌ SupabaseAdmin client not available');
    return NextResponse.json({ error: 'Admin client not available' }, { status: 500 });
  }

  console.log('✅ SupabaseAdmin client available');

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('🛒 Processing checkout.session.completed event');
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('🛒 Session data:', {
          id: session.id,
          mode: session.mode,
          client_reference_id: session.client_reference_id,
          customer: session.customer,
          subscription: session.subscription,
          metadata: session.metadata
        });
        
        if (session.mode === 'subscription' && session.client_reference_id) {
          // Get the plan ID from metadata
          const planId = session.metadata?.planId;
          
          console.log('🛒 Plan ID from metadata:', planId);
          
          if (!planId) {
            console.error('❌ No plan ID found in session metadata');
            break;
          }

          console.log('🛒 Updating instructor subscription for user:', session.client_reference_id);
          console.log('🛒 Plan ID:', planId);
          console.log('🛒 Customer ID:', session.customer);
          console.log('🛒 Subscription ID:', session.subscription);

          // Update instructor's subscription status in the database using admin client
          const { error } = await supabaseAdmin
            .from('instructors')
            .update({ 
              abonnement: planId,
              subscription_status: 'active',
              stripe_customer_id: session.customer as string,
              subscription_id: session.subscription as string
            })
            .eq('id', session.client_reference_id);

          if (error) {
            console.error('❌ Error updating instructor subscription:', error);
          } else {
            console.log('✅ Successfully updated subscription for user', session.client_reference_id, 'to', planId);
          }
        } else {
          console.log('⚠️ Session is not a subscription or missing client_reference_id');
        }
        break;

      case 'customer.subscription.updated':
        console.log('📅 Processing customer.subscription.updated event');
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log('📅 Subscription data:', {
          id: subscription.id,
          status: subscription.status,
          customer: subscription.customer,
          items: subscription.items.data.map(item => ({
            price_id: item.price.id,
            quantity: item.quantity
          }))
        });
        
        if (subscription.status === 'active') {
          // Get the plan ID from the subscription metadata or determine from price ID
          let planId = 'no_subscription';
          
          if (subscription.items.data.length > 0) {
            const priceId = subscription.items.data[0].price.id;
            console.log('📅 Price ID:', priceId);
            
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
            
            console.log('📅 Mapped plan ID:', planId);
          }
          
          console.log('📅 Updating subscription status for customer:', subscription.customer);
          
          // Update subscription status using admin client
          const { error } = await supabaseAdmin
            .from('instructors')
            .update({ 
              abonnement: planId,
              subscription_status: 'active',
              subscription_id: subscription.id
            })
            .eq('stripe_customer_id', subscription.customer);

          if (error) {
            console.error('❌ Error updating subscription status:', error);
          } else {
            console.log('✅ Successfully updated subscription status to active for customer', subscription.customer);
          }
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          console.log('📅 Updating subscription status to inactive for customer:', subscription.customer);
          
          // Update subscription status to inactive using admin client
          const { error } = await supabaseAdmin
            .from('instructors')
            .update({ 
              subscription_status: 'inactive'
            })
            .eq('stripe_customer_id', subscription.customer);

          if (error) {
            console.error('❌ Error updating subscription status:', error);
          } else {
            console.log('✅ Successfully updated subscription status to inactive for customer', subscription.customer);
          }
        }
        break;

      case 'customer.subscription.deleted':
        console.log('🗑️ Processing customer.subscription.deleted event');
        const deletedSubscription = event.data.object as Stripe.Subscription;
        
        console.log('🗑️ Deleted subscription data:', {
          id: deletedSubscription.id,
          customer: deletedSubscription.customer
        });
        
        console.log('🗑️ Updating subscription status to inactive for customer:', deletedSubscription.customer);
        
        // Update subscription status to inactive using admin client
        const { error } = await supabaseAdmin
          .from('instructors')
          .update({ 
            subscription_status: 'inactive'
          })
          .eq('stripe_customer_id', deletedSubscription.customer);

        if (error) {
          console.error('❌ Error updating subscription status:', error);
        } else {
          console.log('✅ Successfully updated subscription status to inactive for customer', deletedSubscription.customer);
        }
        break;

      default:
        console.log('⚠️ Unhandled event type:', event.type);
    }

    console.log('✅ Webhook processing completed successfully');
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
} 