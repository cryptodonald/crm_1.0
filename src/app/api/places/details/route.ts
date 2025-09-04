import { NextRequest, NextResponse } from 'next/server';
import { getGooglePlacesClient } from '@/lib/google/places';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('placeId');
    
    if (!placeId) {
      return NextResponse.json({ 
        error: 'placeId parameter is required' 
      }, { status: 400 });
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

    console.log(`🏠 [Places API] Getting details for place: ${placeId}`);

    // Get place details
    const details = await client.getPlaceDetails(placeId, [
      'formatted_address',
      'address_components',
    ]);

    console.log(`✅ [Places API] Got details for: ${details.formattedAddress}`);

    return NextResponse.json({ details });
  } catch (error) {
    console.error('❌ [Places API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get place details' },
      { status: 500 }
    );
  }
}
