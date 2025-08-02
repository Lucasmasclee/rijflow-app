import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Get user from Supabase
    const { data: user, error: userError } = await supabase.auth.getUser()
    if (userError || !user.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if subscription already exists
    const { data: existingSubscription, error: checkError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.user.id)
      .single()

    if (existingSubscription) {
      return NextResponse.json({
        message: 'Subscription already exists',
        subscription: existingSubscription
      })
    }

    // Create trial subscription (uses database defaults)
    const { data: newSubscription, error: createError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.user.id,
        // Other fields will use database defaults
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating trial subscription:', createError)
      return NextResponse.json(
        { error: 'Failed to create trial subscription: ' + createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Trial subscription created successfully',
      subscription: newSubscription
    })

  } catch (error) {
    console.error('Error creating trial subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 