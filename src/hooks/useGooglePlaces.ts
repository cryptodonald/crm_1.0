'use client';

import { useState, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';

export interface PlaceResult {
  placeId: string;
  description: string;
  structuredFormatting: {
    mainText: string;
    secondaryText: string;
  };
}

export interface PlaceDetails {
  formattedAddress: string;
  addressComponents: Array<{
    longName: string;
    shortName: string;
    types: string[];
  }>;
}

export interface ParsedAddress {
  streetNumber?: string;
  route?: string;
  city?: string;
  zipCode?: string;
  country?: string;
}

class GooglePlacesService {
  private apiKey: string;
  private placesService: google.maps.places.PlacesService | null = null;
  private autocompleteService: google.maps.places.AutocompleteService | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async loadGoogleMapsAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).google?.maps) {
        this.initializeServices();
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places&language=it&region=IT`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if ((window as any).google?.maps) {
          this.initializeServices();
          resolve();
        } else {
          reject(new Error('Google Maps API failed to load'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API script'));
      };

      document.head.appendChild(script);
    });
  }

  private initializeServices(): void {
    if ((window as any).google?.maps) {
      // Create a dummy div for the PlacesService (it needs a map or div)
      const dummyDiv = document.createElement('div');
      this.placesService = new (window as any).google.maps.places.PlacesService(dummyDiv);
      this.autocompleteService = new (window as any).google.maps.places.AutocompleteService();
    }
  }

  async searchPlaces(query: string): Promise<PlaceResult[]> {
    if (!query || query.length < 3) return [];

    await this.loadGoogleMapsAPI();

    if (!this.autocompleteService) {
      throw new Error('Google Maps Autocomplete Service not available');
    }

    return new Promise((resolve, reject) => {
      this.autocompleteService!.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'it' },
          types: ['address'],
        },
        (predictions, status) => {
          const maps = (window as any).google?.maps;
          if (maps && status === maps.places.PlacesServiceStatus.OK && predictions) {
            const results: PlaceResult[] = predictions.map((prediction: any) => ({
              placeId: prediction.place_id,
              description: prediction.description,
              structuredFormatting: {
                mainText: prediction.structured_formatting?.main_text || prediction.description,
                secondaryText: prediction.structured_formatting?.secondary_text || '',
              },
            }));
            resolve(results);
          } else if (maps && status === maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
          } else {
            reject(new Error(`Places API error: ${status}`));
          }
        }
      );
    });
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    await this.loadGoogleMapsAPI();

    if (!this.placesService) {
      throw new Error('Google Maps Places Service not available');
    }

    return new Promise((resolve, reject) => {
      this.placesService!.getDetails(
        {
          placeId: placeId,
          fields: ['formatted_address', 'address_components'],
        },
        (place, status) => {
          const maps = (window as any).google?.maps;
          if (maps && status === maps.places.PlacesServiceStatus.OK && place) {
            const details: PlaceDetails = {
              formattedAddress: (place as any).formatted_address || '',
              addressComponents: ((place as any).address_components || []).map((component: any) => ({
                longName: component.long_name,
                shortName: component.short_name,
                types: component.types,
              })),
            };
            resolve(details);
          } else {
            reject(new Error(`Place details API error: ${status}`));
          }
        }
      );
    });
  }

  static parseAddressComponents(components: PlaceDetails['addressComponents']): ParsedAddress {
    const result: ParsedAddress = {};

    for (const component of components) {
      if (component.types.includes('street_number')) {
        result.streetNumber = component.longName;
      } else if (component.types.includes('route')) {
        result.route = component.longName;
      } else if (component.types.includes('locality')) {
        result.city = component.longName;
      } else if (component.types.includes('administrative_area_level_3') && !result.city) {
        result.city = component.longName;
      } else if (component.types.includes('administrative_area_level_2') && !result.city) {
        result.city = component.longName;
      } else if (component.types.includes('sublocality') && !result.city) {
        result.city = component.longName;
      } else if (component.types.includes('postal_code')) {
        result.zipCode = component.longName;
      } else if (component.types.includes('country')) {
        result.country = component.longName;
      }
    }

    return result;
  }
}

export function useGooglePlaces() {
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);

  // Supporta entrambe le varianti del nome della env
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Se manca la chiave, degrada in modo elegante: nessun autocomplete, nessun throw
  const service = useMemo(() => (apiKey ? new GooglePlacesService(apiKey) : null), [apiKey]);

  const searchPlaces = useCallback(
    debounce(async (query: string) => {
      if (!query.trim() || query.length < 3 || !service) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await service.searchPlaces(query);
        setSuggestions(results);
      } catch (error) {
        console.error('Error searching places:', error);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [service]
  );

  const getPlaceDetails = useCallback(
    async (placeId: string): Promise<PlaceDetails> => {
      if (!service) {
        throw new Error('Google Maps key not configured');
      }
      return service.getPlaceDetails(placeId);
    },
    [service]
  );

  const parseAddressComponents = GooglePlacesService.parseAddressComponents;

  return {
    searchPlaces,
    getPlaceDetails,
    parseAddressComponents,
    isSearching,
    suggestions,
    clearSuggestions: () => setSuggestions([]),
  };
}
