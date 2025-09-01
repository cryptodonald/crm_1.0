/**
 * Google Places API Integration
 * Address completion and geocoding services
 */

import { env } from '@/lib/env';

export interface PlaceResult {
  placeId: string;
  description: string;
  structuredFormatting: {
    mainText: string;
    secondaryText: string;
  };
  types: string[];
}

export interface PlaceDetails {
  placeId: string;
  name?: string;
  formattedAddress: string;
  addressComponents: AddressComponent[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  businessStatus?: string;
  phoneNumber?: string;
  website?: string;
  rating?: number;
  userRatingsTotal?: number;
  openingHours?: {
    openNow: boolean;
    periods: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
    weekdayText: string[];
  };
}

export interface AddressComponent {
  longName: string;
  shortName: string;
  types: string[];
}

export interface ParsedAddress {
  streetNumber?: string;
  streetName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  formattedAddress: string;
}

/**
 * Google Places API Client
 */
export class GooglePlacesClient {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? env.GOOGLE_PLACES_API_KEY;
  }

  /**
   * Search for place predictions (autocomplete)
   */
  async searchPlaces(
    input: string,
    options: {
      types?: string[];
      componentRestrictions?: { country?: string };
      sessionToken?: string;
    } = {}
  ): Promise<PlaceResult[]> {
    if (!input.trim()) {
      return [];
    }

    const params = new URLSearchParams({
      input: input.trim(),
      key: this.apiKey,
    });

    if (options.types) {
      params.set('types', options.types.join('|'));
    }

    if (options.componentRestrictions?.country) {
      params.set(
        'components',
        `country:${options.componentRestrictions.country}`
      );
    }

    if (options.sessionToken) {
      params.set('sessiontoken', options.sessionToken);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/place/autocomplete/json?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(
          `Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`
        );
      }

      return (
        data.predictions?.map((prediction: any) => ({
          placeId: prediction.place_id,
          description: prediction.description,
          structuredFormatting: {
            mainText: prediction.structured_formatting?.main_text || '',
            secondaryText:
              prediction.structured_formatting?.secondary_text || '',
          },
          types: prediction.types || [],
        })) || []
      );
    } catch (error) {
      console.error('[Google Places] Search error:', error);
      throw error;
    }
  }

  /**
   * Get detailed place information
   */
  async getPlaceDetails(
    placeId: string,
    fields: string[] = [
      'place_id',
      'name',
      'formatted_address',
      'address_components',
      'geometry',
      'types',
      'business_status',
      'formatted_phone_number',
      'website',
      'rating',
      'user_ratings_total',
      'opening_hours',
    ]
  ): Promise<PlaceDetails> {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: fields.join(','),
      key: this.apiKey,
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/place/details/json?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(
          `Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`
        );
      }

      const result = data.result;

      return {
        placeId: result.place_id,
        name: result.name,
        formattedAddress: result.formatted_address,
        addressComponents:
          result.address_components?.map((component: any) => ({
            longName: component.long_name,
            shortName: component.short_name,
            types: component.types,
          })) || [],
        geometry: {
          location: {
            lat: result.geometry?.location?.lat || 0,
            lng: result.geometry?.location?.lng || 0,
          },
        },
        types: result.types || [],
        businessStatus: result.business_status,
        phoneNumber: result.formatted_phone_number,
        website: result.website,
        rating: result.rating,
        userRatingsTotal: result.user_ratings_total,
        openingHours: result.opening_hours
          ? {
              openNow: result.opening_hours.open_now,
              periods: result.opening_hours.periods || [],
              weekdayText: result.opening_hours.weekday_text || [],
            }
          : undefined,
      };
    } catch (error) {
      console.error('[Google Places] Details error:', error);
      throw error;
    }
  }

  /**
   * Geocode an address
   */
  async geocodeAddress(address: string): Promise<{
    location: { lat: number; lng: number };
    formattedAddress: string;
    addressComponents: AddressComponent[];
  }> {
    const params = new URLSearchParams({
      address,
      key: this.apiKey,
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/geocode/json?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Google Geocoding API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(
          `Google Geocoding API error: ${data.status} - ${data.error_message || 'Unknown error'}`
        );
      }

      const result = data.results[0];
      if (!result) {
        throw new Error('No geocoding results found');
      }

      return {
        location: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components.map((component: any) => ({
          longName: component.long_name,
          shortName: component.short_name,
          types: component.types,
        })),
      };
    } catch (error) {
      console.error('[Google Geocoding] Error:', error);
      throw error;
    }
  }

  /**
   * Parse address components into structured format
   */
  static parseAddressComponents(components: AddressComponent[]): ParsedAddress {
    const parsed: ParsedAddress = {
      formattedAddress: '',
    };

    for (const component of components) {
      if (component.types.includes('street_number')) {
        parsed.streetNumber = component.longName;
      } else if (component.types.includes('route')) {
        parsed.streetName = component.longName;
      } else if (
        component.types.includes('locality') ||
        component.types.includes('administrative_area_level_2')
      ) {
        parsed.city = component.longName;
      } else if (component.types.includes('administrative_area_level_1')) {
        parsed.state = component.shortName;
      } else if (component.types.includes('postal_code')) {
        parsed.zipCode = component.longName;
      } else if (component.types.includes('country')) {
        parsed.country = component.longName;
      }
    }

    // Build formatted address
    const parts = [
      parsed.streetNumber && parsed.streetName
        ? `${parsed.streetNumber} ${parsed.streetName}`
        : parsed.streetName,
      parsed.city,
      parsed.state,
      parsed.zipCode,
      parsed.country,
    ].filter(Boolean);

    parsed.formattedAddress = parts.join(', ');

    return parsed;
  }

  /**
   * Generate session token for billing optimization
   */
  static generateSessionToken(): string {
    return crypto.randomUUID();
  }
}

// Singleton instance
let clientInstance: GooglePlacesClient | null = null;

/**
 * Get Google Places client instance
 */
export function getGooglePlacesClient(): GooglePlacesClient {
  if (!clientInstance) {
    clientInstance = new GooglePlacesClient();
  }
  return clientInstance;
}
