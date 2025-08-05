import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('🔍 DEBUG API CALLED');
  console.log('🔍 Request method:', request.method);
  console.log('🔍 Request URL:', request.url);
  
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
    
    // Test Supabase connection
    console.log('🔍 Testing Supabase connection...');
         const { data, error } = await supabaseAdmin
       .from('instructors')
       .select('count')
       .limit(1);
    
    console.log('🔍 Supabase test - data:', data);
    console.log('🔍 Supabase test - error:', error);
    
    return NextResponse.json({
      success: true,
      message: 'Debug endpoint working',
      supabaseTest: {
        data,
        error: error ? error.message : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🔍 DEBUG API ERROR:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 