import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('🚀 setup-basic-subscription API called');
  console.log('🚀 Request method:', request.method);
  console.log('🚀 Request URL:', request.url);
  console.log('🚀 Environment check - SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('🚀 Environment check - SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  if (!supabaseAdmin) {
    console.error('❌ SupabaseAdmin client not available');
    return NextResponse.json({
      success: false,
      error: 'Admin client not available',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
  
  try {
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { userId, planId } = body;

    console.log('🆔 User ID:', userId);
    console.log('📋 Plan ID:', planId);

    if (!userId || !planId) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'User ID and Plan ID are required' },
        { status: 400 }
      );
    }

    // Validate that it's a basic plan
    console.log('🔍 Validating plan type...');
    if (!planId.startsWith('basic-')) {
      console.log('❌ Plan is not basic:', planId);
      return NextResponse.json(
        { error: 'Only basic plans can be set up without payment' },
        { status: 400 }
      );
    }
    console.log('✅ Plan validation passed');

    // Check if user exists in instructors table, create if not
    console.log('🔍 Checking if instructor exists in database...');
    console.log('🔍 Query: SELECT * FROM instructors WHERE id =', userId);
    
    let { data: instructor, error: fetchError } = await supabaseAdmin
      .from('instructors')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('📊 Supabase response - data:', instructor);
    console.log('📊 Supabase response - error:', fetchError);

    // If instructor doesn't exist, create a new record
    if (fetchError && fetchError.code === 'PGRST116') {
      console.log('⚠️ Instructor not found, creating new record...');
      
      const { data: newInstructor, error: createError } = await supabaseAdmin
        .from('instructors')
        .insert({
          id: userId,
          email: '', // Will be updated by AuthContext
          rijschoolnaam: '',
          abonnement: 'no_subscription',
          subscription_status: 'inactive',
          start_free_trial: null
        })
        .select()
        .single();

      console.log('📊 Create response - data:', newInstructor);
      console.log('📊 Create response - error:', createError);

      if (createError) {
        console.error('❌ Error creating instructor:', createError);
        return NextResponse.json(
          { error: 'Failed to create instructor record' },
          { status: 500 }
        );
      }

      instructor = newInstructor;
      console.log('✅ Successfully created instructor record');
    } else if (fetchError) {
      console.error('❌ Error fetching instructor data:', fetchError);
      console.error('❌ Error details:', {
        message: fetchError.message,
        details: fetchError.details,
        hint: fetchError.hint,
        code: fetchError.code
      });
      return NextResponse.json(
        { error: 'Failed to fetch instructor data' },
        { status: 500 }
      );
    }

    console.log('✅ Successfully fetched/created instructor data');

    // Check if user has already had a free trial (more than 60 days ago)
    console.log('🔍 Checking free trial status...');
    console.log('🔍 Instructor data:', instructor);
    console.log('🔍 start_free_trial:', instructor.start_free_trial);
    
    if (instructor.start_free_trial) {
      const trialStartDate = new Date(instructor.start_free_trial);
      const currentDate = new Date();
      const daysSinceTrialStart = Math.floor((currentDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log('📅 Trial start date:', trialStartDate);
      console.log('📅 Current date:', currentDate);
      console.log('📅 Days since trial start:', daysSinceTrialStart);
      
      if (daysSinceTrialStart > 60) {
        console.log('❌ Free trial already used');
        return NextResponse.json(
          { error: 'Free trial already used' },
          { status: 400 }
        );
      }
    }
    
    console.log('✅ Free trial check passed');

    // Update instructor with basic subscription and start free trial
    console.log('🔧 Updating instructor subscription...');
    console.log('🔧 Update data:', {
      abonnement: planId,
      start_free_trial: new Date().toISOString(),
      subscription_status: 'active'
    });
    
    const { error: updateError } = await supabaseAdmin
      .from('instructors')
      .update({
        abonnement: planId,
        start_free_trial: new Date().toISOString(),
        subscription_status: 'active'
      })
      .eq('id', userId);

    console.log('📊 Update response - error:', updateError);

    if (updateError) {
      console.error('❌ Error updating instructor subscription:', updateError);
      console.error('❌ Update error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    console.log('✅ Successfully updated instructor subscription');
    return NextResponse.json({ 
      success: true,
      message: 'Free trial started successfully'
    });
  } catch (error) {
    console.error('💥 Caught exception in setup-basic-subscription:', error);
    console.error('💥 Error type:', typeof error);
    console.error('💥 Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'Failed to set up subscription' },
      { status: 500 }
    );
  }
} 