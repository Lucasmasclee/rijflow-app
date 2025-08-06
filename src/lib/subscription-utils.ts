import { supabase } from './supabase';

export interface SubscriptionStatus {
  abonnement: 'no_subscription' | 'basic-monthly' | 'basic-yearly' | 'premium-monthly' | 'premium-yearly';
  start_free_trial: string | null;
  subscription_status: 'active' | 'inactive';
  stripe_customer_id?: string;
  subscription_id?: string;
}

export async function checkAndUpdateSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null> {
  try {
    // Fetch current instructor data
    const { data: instructor, error } = await supabase
      .from('instructors')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching instructor data:', error);
      return null;
    }

    if (!instructor) {
      console.error('Instructor not found');
      return null;
    }

    const currentDate = new Date();
    const trialStartDate = instructor.start_free_trial ? new Date(instructor.start_free_trial) : null;
    const daysSinceTrialStart = trialStartDate 
      ? Math.floor((currentDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    let shouldUpdate = false;
    let updatedData: Partial<SubscriptionStatus> = {};

    // Check if trial period has expired (more than 60 days)
    if (trialStartDate && daysSinceTrialStart && daysSinceTrialStart > 60 && instructor.abonnement !== 'no_subscription') {
      // Trial period expired - update to no_subscription and inactive
      if (instructor.abonnement !== 'no_subscription' || instructor.subscription_status !== 'inactive') {
        updatedData = {
          abonnement: 'no_subscription',
          subscription_status: 'inactive'
        };
        shouldUpdate = true;
      }
    } else if (trialStartDate && daysSinceTrialStart && daysSinceTrialStart <= 60) {
      // Trial period is still active - ensure abonnement is 'no_subscription' and status is 'active'
      if (instructor.abonnement !== 'no_subscription' || instructor.subscription_status !== 'active') {
        updatedData = {
          abonnement: 'no_subscription',
          subscription_status: 'active'
        };
        shouldUpdate = true;
      }
    }

    // Update the database if needed
    if (shouldUpdate) {
      const { error: updateError } = await supabase
        .from('instructors')
        .update(updatedData)
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating subscription status:', updateError);
        return null;
      }

      // Return updated data
      return {
        abonnement: updatedData.abonnement || instructor.abonnement,
        start_free_trial: instructor.start_free_trial,
        subscription_status: updatedData.subscription_status || instructor.subscription_status,
        stripe_customer_id: instructor.stripe_customer_id,
        subscription_id: instructor.subscription_id
      };
    }

    // Return current data if no updates needed
    return {
      abonnement: instructor.abonnement,
      start_free_trial: instructor.start_free_trial,
      subscription_status: instructor.subscription_status,
      stripe_customer_id: instructor.stripe_customer_id,
      subscription_id: instructor.subscription_id
    };
  } catch (error) {
    console.error('Error in checkAndUpdateSubscriptionStatus:', error);
    return null;
  }
}

export function shouldRedirectToSubscription(subscriptionStatus: SubscriptionStatus | null): boolean {
  if (!subscriptionStatus) return true;

  // If subscription is active, don't redirect
  if (subscriptionStatus.subscription_status === 'active') {
    return false;
  }

  // If subscription is inactive, redirect
  if (subscriptionStatus.subscription_status === 'inactive') {
    return true;
  }

  // Check trial period for expired trials
  if (subscriptionStatus.start_free_trial) {
    const trialStartDate = new Date(subscriptionStatus.start_free_trial);
    const currentDate = new Date();
    const daysSinceTrialStart = Math.floor((currentDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If trial period has expired, redirect
    if (daysSinceTrialStart > 60) {
      return true;
    }
  }

  return false;
}

export function getSubscriptionDisplayInfo(subscriptionStatus: SubscriptionStatus | null) {
  if (!subscriptionStatus) return null;

  const trialStartDate = subscriptionStatus.start_free_trial ? new Date(subscriptionStatus.start_free_trial) : null;
  const daysSinceTrialStart = trialStartDate 
    ? Math.floor((new Date().getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Trial period - check for active trial period
  if (trialStartDate && daysSinceTrialStart && daysSinceTrialStart <= 60 && subscriptionStatus.subscription_status === 'active') {
    const remainingDays = 60 - daysSinceTrialStart;
    return {
      type: 'trial',
      text: `Proefperiode, nog ${remainingDays} dagen gratis`,
      color: 'bg-green-100 text-green-800 border-green-200'
    };
  }

  // Expired trial
  if (subscriptionStatus.abonnement === 'no_subscription' && trialStartDate && daysSinceTrialStart && daysSinceTrialStart > 60) {
    return {
      type: 'expired',
      text: 'Proefperiode verlopen',
      color: 'bg-red-100 text-red-800 border-red-200'
    };
  }

  // Active subscriptions
  if (subscriptionStatus.subscription_status === 'active') {
    if (subscriptionStatus.abonnement.startsWith('basic-')) {
      return {
        type: 'basic',
        text: 'Basic abonnement',
        color: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    }
    if (subscriptionStatus.abonnement.startsWith('premium-')) {
      return {
        type: 'premium',
        text: 'Premium abonnement',
        color: 'bg-purple-100 text-purple-800 border-purple-200'
      };
    }
  }

  return null;
}

export function hasValidSubscription(subscriptionStatus: SubscriptionStatus | null): boolean {
  if (!subscriptionStatus) return false;

  // If subscription is active, it's valid
  if (subscriptionStatus.subscription_status === 'active') {
    return true;
  }

  // Check trial period for basic subscriptions or no_subscription with active status
  if ((subscriptionStatus.abonnement.startsWith('basic-') || subscriptionStatus.abonnement === 'no_subscription') && subscriptionStatus.start_free_trial) {
    const trialStartDate = new Date(subscriptionStatus.start_free_trial);
    const currentDate = new Date();
    const daysSinceTrialStart = Math.floor((currentDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If trial period is still valid (≤ 60 days), it's valid
    if (daysSinceTrialStart <= 60) {
      return true;
    }
  }

  return false;
} 