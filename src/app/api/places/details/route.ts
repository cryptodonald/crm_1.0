import { NextRequest, NextResponse } from 'next/server';
import { getGooglePlacesClient } from '@/lib/google/places';
import { getGoogleMapsKey } from '@/lib/api-keys-service';
import { getCachedPlacesDetails } from '@/lib/cache';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

export async function GET(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    console.log('🔧 [Places Details API] Starting GET request');
    
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('placeId');
    
    if (!placeId) {
      recordError('places_details_api', 'Missing placeId parameter');
      return NextResponse.json({ 
        error: 'placeId parameter is required',
        success: false,
      }, { status: 400 });
    }
    
    const cacheKey = `details:${placeId}`;

    // 🚀 Use caching system - Place details rarely change
    const result = await getCachedPlacesDetails(cacheKey, async () => {
      const credentialsStart = performance.now();
      
      // ✅ Get Google Places API key from KV service (NOT process.env)
      console.log('🔑 [Places API] Fetching API key from KV service...');
      const apiKey = await getGoogleMapsKey();
      
      const credentialsTime = performance.now() - credentialsStart;
      console.log(`🔑 [TIMING] Places Details credentials: ${credentialsTime.toFixed(2)}ms`);
      
      if (!apiKey) {
        throw new Error('Google Places API key not available from KV service');
      }
      
      console.log('✅ [Places API] API key retrieved successfully from KV service');
      console.log('🔑 [Places API] Key length:', apiKey.length);

      // Create client with API key from KV
      const client = getGooglePlacesClient();
      client.setApiKey(apiKey);

      console.log(`🏠 [Places API] Getting details for place: ${placeId}`);
      
      const detailsStart = performance.now();

      // Get place details
      const details = await client.getPlaceDetails(placeId, [
        'formatted_address',
        'address_components',
      ]);
      
      const detailsTime = performance.now() - detailsStart;
      console.log(`🚀 [TIMING] Places details fetch: ${detailsTime.toFixed(2)}ms`);

      console.log(`✅ [Places API] Got details for: ${details.formattedAddress}`);

      return {
        success: true,
        details,
      };
    });
    
    const totalTime = performance.now() - requestStart;
    const wasCached = totalTime < 100; // Assume cached if under 100ms
    
    // 📈 Record performance metrics
    recordApiLatency('places_details_api', totalTime, wasCached);
    
    console.log(`✅ [Places Details API] Completed in ${totalTime.toFixed(2)}ms (cached: ${wasCached})`);
    
    return NextResponse.json({
      ...result,
      _timing: {
        total: Math.round(totalTime),
        cached: wasCached,
      }
    });
  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 📈 Record error metrics
    recordError('places_details_api', errorMessage);
    recordApiLatency('places_details_api', totalTime, false);
    
    console.error(`❌ [Places Details API] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      {
        error: 'Failed to get place details',
        success: false,
        details: null,
        _timing: {
          total: Math.round(totalTime),
          cached: false,
        }
      },
      { status: 500 }
    );
  }
}
