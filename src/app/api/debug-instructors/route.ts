import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get user from Supabase
    const { data: user, error: userError } = await supabase.auth.getUser()
    if (userError || !user.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get instructor record
    const { data: instructor, error: instructorError } = await supabase
      .from('instructors')
      .select('*')
      .eq('id', user.user.id)
      .single()

    // Get all instructors for debugging
    const { data: allInstructors, error: allInstructorsError } = await supabase
      .from('instructors')
      .select('*')
      .limit(5)

    // Get subscriptions for this user
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.user.id)
      .single()

    return NextResponse.json({
      user: {
        id: user.user.id,
        email: user.user.email,
        metadata: user.user.user_metadata
      },
      instructor: instructor || null,
      instructorError: instructorError ? instructorError.message : null,
      allInstructors: allInstructors || [],
      allInstructorsError: allInstructorsError ? allInstructorsError.message : null,
      subscription: subscription || null,
      subscriptionError: subscriptionError ? subscriptionError.message : null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in debug instructors:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 