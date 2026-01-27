import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('[Test] Received POST request');
  
  try {
    const body = await request.json();
    console.log('[Test] Parsed body:', body);
    
    // Simula un delay simile al merge
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('[Test] About to send response');
    
    return NextResponse.json({
      success: true,
      message: 'Test endpoint working',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Test] Error:', error);
    return NextResponse.json(
      { error: 'Test failed' },
      { status: 500 }
    );
  }
}
