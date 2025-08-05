import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('🔍 DEBUG DATABASE API CALLED');
  console.log('🔍 Using admin client with service role key');
  
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
    console.log('🔍 Request body:', body);
    const { userId } = body;
    
    // Get all instructors
    console.log('🔍 Getting all instructors...');
    const { data: allInstructors, error: allError } = await supabaseAdmin
      .from('instructors')
      .select('*');
    
    console.log('🔍 All instructors:', allInstructors);
    console.log('🔍 All instructors error:', allError);
    
    // Try to find specific user
    if (userId) {
      console.log('🔍 Looking for specific user:', userId);
      const { data: specificUser, error: specificError } = await supabaseAdmin
        .from('instructors')
        .select('*')
        .eq('id', userId);
      
      console.log('🔍 Specific user data:', specificUser);
      console.log('🔍 Specific user error:', specificError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database debug completed',
      allInstructors,
      allError: allError ? allError.message : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🔍 DEBUG DATABASE ERROR:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 