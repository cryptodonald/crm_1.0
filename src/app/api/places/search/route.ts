import { NextRequest, NextResponse } from 'next/server';
import { getGooglePlacesClient } from '@/lib/google/places';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length < 3) {
      return NextResponse.json({ results: [] });
    }

    // Get Google Places API key from Environment Variable
    console.log('🔑 [Places API] Fetching API key from Environment Variable...');
    const apiKey = process.env.GOOGLE_MAPS_API;
    if (!apiKey) {
      console.warn('⚠️ Google Places API key not found in environment variables');
      return NextResponse.json({ 
        error: 'Google Places API key not configured',
        debug: 'GOOGLE_MAPS_API environment variable is missing'
      }, { status: 500 });
    }
    console.log('✅ [Places API] API key retrieved successfully from environment');
    console.log('🔑 [Places API] Key length:', apiKey.length);

    // Create client with API key from KV
    const client = getGooglePlacesClient();
    client.setApiKey(apiKey);

    console.log(`🔍 [Places API] Searching for: "${query}"`);

    // Search places
    const results = await client.searchPlaces(query, {
      componentRestrictions: { country: 'it' },
      types: ['address'],
    });

    console.log(`🏠 [Places API] Found ${results.length} results`);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('❌ [Places API] Error:', error);
    
    // Check if it's an API key restriction error
    if (error instanceof Error && error.message.includes('referer restrictions')) {
      return NextResponse.json(
        { 
          error: 'Google Maps API key has referer restrictions',
          message: 'Please configure the API key without referer restrictions for server-side use',
          debug: 'Go to Google Cloud Console > APIs & Services > Credentials and remove HTTP referrer restrictions'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to search places', debug: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
