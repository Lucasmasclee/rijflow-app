import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is not authenticated and trying to access protected routes
  if (!user && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  // If user is authenticated, check subscription for all dashboard access
  if (user && req.nextUrl.pathname.startsWith('/dashboard')) {
    // Allow access to schedule-settings for new instructors
    const isScheduleSettingsPage = req.nextUrl.pathname === '/dashboard/schedule-settings'
    
    // Get user's instructor record with subscription data
    const { data: instructor } = await supabase
      .from('instructors')
      .select('*')
      .eq('id', user.id)
      .single()

    // If no instructor record exists, create one with trial subscription
    if (!instructor) {
      console.log('No instructor record found for user:', user.id, '- creating instructor with trial subscription')
      
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 60) // 60 days trial

      const { data: newInstructor, error: createError } = await supabase
        .from('instructors')
        .insert({
          id: user.id,
          email: user.email || '',
          rijschoolnaam: 'Mijn Rijschool',
          subscription_status: 'trial',
          trial_ends_at: trialEndDate.toISOString(),
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating instructor with trial subscription in middleware:', createError)
        // If we can't create instructor record, still allow access to subscription page
        if (req.nextUrl.pathname === '/dashboard/abonnement') {
          return res
        }
        // Redirect to subscription page to handle manually
        return NextResponse.redirect(new URL('/dashboard/abonnement', req.url))
      }

      console.log('Successfully created instructor with trial subscription for user:', user.id)
      
      // Successfully created trial subscription, check if new instructor needs to go to schedule-settings
      if (user.user_metadata?.role === 'instructor') {
        const { data: availabilityData, error: availabilityError } = await supabase
          .from('standard_availability')
          .select('id')
          .eq('instructor_id', user.id)
          .single()

        if (availabilityError && availabilityError.code === 'PGRST116') {
          // New instructor - redirect to schedule-settings
          return NextResponse.redirect(new URL('/dashboard/schedule-settings', req.url))
        }
      }
      // Allow access to dashboard
      return res
    }

    // Check if user has active subscription or is in trial
    const hasActiveSubscription = instructor && (
      instructor.subscription_status === 'active' ||
      instructor.subscription_status === 'trialing' ||
      (instructor.subscription_status === 'trial' && 
       instructor.trial_ends_at && 
       new Date(instructor.trial_ends_at) > new Date())
    )

    // Allow access to subscription page and schedule-settings even without active subscription
    const isSubscriptionPage = req.nextUrl.pathname === '/dashboard/abonnement'
    const isAllowedWithoutSubscription = isSubscriptionPage || isScheduleSettingsPage

    // If no active subscription and not on allowed pages, redirect to subscription page
    if (!hasActiveSubscription && !isAllowedWithoutSubscription) {
      return NextResponse.redirect(new URL('/dashboard/abonnement', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 