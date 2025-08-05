import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🧪 Test API endpoint called');
  return NextResponse.json({ 
    success: true, 
    message: 'Test API endpoint working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  console.log('🧪 Test API POST endpoint called');
  try {
    const body = await request.json();
    console.log('🧪 Test POST body:', body);
    return NextResponse.json({ 
      success: true, 
      message: 'Test POST endpoint working',
      receivedData: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🧪 Test API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to parse request body' 
    }, { status: 400 });
  }
} 