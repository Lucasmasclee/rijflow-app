import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch instructor data to get Stripe customer ID
    const { data: instructor, error: fetchError } = await supabaseAdmin
      .from('instructors')
      .select('stripe_customer_id, subscription_id, abonnement')
      .eq('id', userId)
      .single();

    if (fetchError || !instructor) {
      console.error('Error fetching instructor data:', fetchError);
      return NextResponse.json(
        { error: 'Instructor not found' },
        { status: 404 }
      );
    }

    // Check if user has a valid subscription to cancel
    if (!instructor.stripe_customer_id || !instructor.subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found to cancel' },
        { status: 400 }
      );
    }

    // Check if subscription is already cancelled
    if (instructor.abonnement === 'no_subscription') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled' },
        { status: 400 }
      );
    }

    // Cancel the subscription in Stripe
    const subscription = await stripe.subscriptions.update(instructor.subscription_id, {
      cancel_at_period_end: true, // Cancel at the end of the current billing period
    });

    if (subscription.status === 'active' && subscription.cancel_at_period_end) {
      // Update the database to reflect the cancellation
      const { error: updateError } = await supabaseAdmin
        .from('instructors')
        .update({
          abonnement: 'no_subscription',
          subscription_status: 'inactive',
          // Keep stripe_customer_id and subscription_id for reference
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating instructor data:', updateError);
        return NextResponse.json(
          { error: 'Failed to update subscription status' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription cancelled successfully. You will have access until the end of your current billing period.',
        cancelAt: subscription.cancel_at
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to cancel subscription' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
