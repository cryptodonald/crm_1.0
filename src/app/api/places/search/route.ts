import { NextRequest, NextResponse } from 'next/server';
import { getGooglePlacesClient } from '@/lib/google/places';
import { getGoogleMapsKey } from '@/lib/api-keys-service';
import { getCachedPlacesSearch } from '@/lib/cache';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

export async function GET(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    console.log('🔧 [Places Search API] Starting GET request');
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length < 3) {
      return NextResponse.json({ results: [] });
    }
    
    const sanitizedQuery = query.trim().toLowerCase();
    const cacheKey = `search:${sanitizedQuery}:italy`;

    // 🚀 Use caching system - Google Places has rate limits!
    const result = await getCachedPlacesSearch(cacheKey, async () => {
      const credentialsStart = performance.now();
      
      // ✅ Get Google Places API key from KV service (NOT process.env)
      console.log('🔑 [Places API] Fetching API key from KV service...');
      const apiKey = await getGoogleMapsKey();
      
      const credentialsTime = performance.now() - credentialsStart;
      console.log(`🔑 [TIMING] Places credentials: ${credentialsTime.toFixed(2)}ms`);
      
      if (!apiKey) {
        throw new Error('Google Places API key not available from KV service');
      }
      
      console.log('✅ [Places API] API key retrieved successfully from KV service');
      console.log('🔑 [Places API] Key length:', apiKey.length);

      // Create client with API key from KV
      const client = getGooglePlacesClient();
      client.setApiKey(apiKey);

      console.log(`🔍 [Places API] Searching for: "${query}"`);
      
      const searchStart = performance.now();

      // Search places
      const results = await client.searchPlaces(query, {
        componentRestrictions: { country: 'it' },
        types: ['address'],
      });
      
      const searchTime = performance.now() - searchStart;
      console.log(`🚀 [TIMING] Places search: ${searchTime.toFixed(2)}ms`);

      console.log(`🏠 [Places API] Found ${results.length} results`);

      return {
        success: true,
        results,
        count: results.length,
      };
    });
    
    const totalTime = performance.now() - requestStart;
    const wasCached = totalTime < 100; // Assume cached if under 100ms
    
    // 📈 Record performance metrics
    recordApiLatency('places_search_api', totalTime, wasCached);
    
    console.log(`✅ [Places Search API] Completed: ${result.count} results in ${totalTime.toFixed(2)}ms (cached: ${wasCached})`);
    
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
    recordError('places_search_api', errorMessage);
    recordApiLatency('places_search_api', totalTime, false);
    
    console.error(`❌ [Places Search API] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    // Check if it's an API key restriction error
    if (error instanceof Error && error.message.includes('referer restrictions')) {
      return NextResponse.json(
        { 
          error: 'Google Maps API key has referer restrictions',
          message: 'Please configure the API key without referer restrictions for server-side use',
          debug: 'Go to Google Cloud Console > APIs & Services > Credentials and remove HTTP referrer restrictions',
          success: false,
          results: [],
          count: 0,
          _timing: {
            total: Math.round(totalTime),
            cached: false,
          }
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to search places', 
        success: false,
        results: [],
        count: 0,
        details: errorMessage,
        _timing: {
          total: Math.round(totalTime),
          cached: false,
        }
      },
      { status: 500 }
    );
  }
}
