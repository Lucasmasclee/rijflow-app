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
    if (trialStartDate && daysSinceTrialStart && daysSinceTrialStart > 60 && instructor.abonnement === 'no_subscription' && instructor.subscription_status === 'active') {
      // Trial period expired - update to no_subscription and inactive
      if (instructor.abonnement !== 'no_subscription' || instructor.subscription_status !== 'inactive') {
        updatedData = {
          abonnement: 'no_subscription',
          subscription_status: 'inactive'
        };
        shouldUpdate = true;
      }
    } else if (trialStartDate && daysSinceTrialStart && daysSinceTrialStart <= 60 && instructor.abonnement === 'no_subscription' && instructor.subscription_status === 'active') {
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

export async function getRedirectPath(userId: string, subscriptionStatus: SubscriptionStatus | null): Promise<string | null> {
  if (!subscriptionStatus) return '/dashboard/abonnement';

  const { supabase } = await import('./supabase');
  
  // Check if user has schedule-settings record
  const { data: availabilityData, error: availabilityError } = await supabase
    .from('standard_availability')
    .select('id')
    .eq('instructor_id', userId)
    .single();
  
  let hasScheduleSettings = false;
  if (!availabilityError) {
    // No error means we found a record
    hasScheduleSettings = true;
  } else if (availabilityError.code === 'PGRST116') {
    // PGRST116 means no rows found
    hasScheduleSettings = false;
  } else {
    // Any other error means something went wrong, assume no settings
    hasScheduleSettings = false;
  }

  // Calculate trial days if applicable
  let trialDays = null;
  if (subscriptionStatus.start_free_trial) {
    const trialStartDate = new Date(subscriptionStatus.start_free_trial);
    const currentDate = new Date();
    trialDays = Math.floor((currentDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // no_subscription & inactive -> dashboard/abonnement
  if (subscriptionStatus.abonnement === 'no_subscription' && subscriptionStatus.subscription_status === 'inactive') {
    return '/dashboard/abonnement';
  }

  // no_subscription & active & (start_free_trial > 60) -> dashboard/abonnement
  if (subscriptionStatus.abonnement === 'no_subscription' && subscriptionStatus.subscription_status === 'active' && trialDays !== null && trialDays > 60) {
    return '/dashboard/abonnement';
  }

  // no_subscription & active & (start_free_trial <= 60) & geen schedule-settings record -> dashboard/schedule-settings
  if (subscriptionStatus.abonnement === 'no_subscription' && subscriptionStatus.subscription_status === 'active' && (trialDays === null || trialDays <= 60) && !hasScheduleSettings) {
    console.log('🎯 Redirect: no_subscription & active & trial <= 60 & noScheduleSettings -> dashboard/schedule-settings');
    return '/dashboard/schedule-settings';
  }

  // no_subscription & active & (start_free_trial <= 60) & wel schedule-settings record -> dashboard (niks)
  if (subscriptionStatus.abonnement === 'no_subscription' && subscriptionStatus.subscription_status === 'active' && (trialDays === null || trialDays <= 60) && hasScheduleSettings) {
    console.log('🎯 Redirect: no_subscription & active & trial <= 60 & hasScheduleSettings -> stay on current page');
    return null; // Stay on current page
  }

  // (abonnement != no_subscription) && (subscription_status == active) & geen schedule-settings record -> dashboard/schedule-settings
  if (subscriptionStatus.abonnement !== 'no_subscription' && subscriptionStatus.subscription_status === 'active' && !hasScheduleSettings) {
    return '/dashboard/schedule-settings';
  }

  // (abonnement != no_subscription) && (subscription_status == active) & wel schedule-settings record -> dashboard (niks)
  if (subscriptionStatus.abonnement !== 'no_subscription' && subscriptionStatus.subscription_status === 'active' && hasScheduleSettings) {
    return null; // Stay on current page
  }

  // Default fallback
  return '/dashboard/abonnement';
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