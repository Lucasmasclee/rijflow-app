import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If no session, redirect to signin
  if (!session) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  // Check if user is instructor and has active subscription for protected routes
  const userRole = session.user.user_metadata?.role
  const isInstructor = userRole === 'instructor'
  
  // Protected routes that require active subscription
  const protectedRoutes = [
    '/dashboard',
    '/dashboard/students',
    '/dashboard/lessons',
    '/dashboard/ai-schedule',
    '/dashboard/schedule-settings'
  ]

  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )

  if (isInstructor && isProtectedRoute) {
    // Get instructor data to check subscription status
    const { data: instructor } = await supabase
      .from('instructors')
      .select('subscription_status, trial_ends_at')
      .eq('id', session.user.id)
      .single()

    if (instructor) {
      const hasActiveSubscription = instructor.subscription_status === 'active' || 
                                  instructor.subscription_status === 'trial'
      
      const isTrialExpired = instructor.trial_ends_at && 
                            new Date(instructor.trial_ends_at) < new Date()

      // If no active subscription and trial is expired, redirect to subscription page
      if (!hasActiveSubscription || isTrialExpired) {
        return NextResponse.redirect(new URL('/dashboard/abonnement', req.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*'
  ],
} 