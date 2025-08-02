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
    // Get user's subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Check if user has active subscription or is in trial
    const hasActiveSubscription = subscription && (
      subscription.subscription_status === 'active' ||
      subscription.subscription_status === 'trialing' ||
      (subscription.subscription_status === 'trial' && 
       subscription.trial_ends_at && 
       new Date(subscription.trial_ends_at) > new Date())
    )

    // Allow access to subscription page even without active subscription
    const isSubscriptionPage = req.nextUrl.pathname === '/dashboard/abonnement'

    // If no active subscription and not on subscription page, redirect to subscription page
    if (!hasActiveSubscription && !isSubscriptionPage) {
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