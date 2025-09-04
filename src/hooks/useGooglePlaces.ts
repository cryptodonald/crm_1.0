'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
      if (typeof window !== 'undefined' && window.google?.maps) {
        this.initializeServices();
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places&language=it&region=IT`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if (window.google?.maps) {
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
    if (window.google?.maps) {
      // Create a dummy div for the PlacesService (it needs a map or div)
      const dummyDiv = document.createElement('div');
      this.placesService = new window.google.maps.places.PlacesService(dummyDiv);
      this.autocompleteService = new window.google.maps.places.AutocompleteService();
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
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            const results: PlaceResult[] = predictions.map(prediction => ({
              placeId: prediction.place_id,
              description: prediction.description,
              structuredFormatting: {
                mainText: prediction.structured_formatting?.main_text || prediction.description,
                secondaryText: prediction.structured_formatting?.secondary_text || '',
              },
            }));
            resolve(results);
          } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
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
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const details: PlaceDetails = {
              formattedAddress: place.formatted_address || '',
              addressComponents: (place.address_components || []).map(component => ({
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
        // Prima priorità: locality (es. Milano, Roma)
        result.city = component.longName;
      } else if (component.types.includes('administrative_area_level_3') && !result.city) {
        // Seconda priorità: administrative_area_level_3 (es. comuni più piccoli)
        result.city = component.longName;
      } else if (component.types.includes('administrative_area_level_2') && !result.city) {
        // Terza priorità: administrative_area_level_2 (es. province, ma a volte contiene città)
        result.city = component.longName;
      } else if (component.types.includes('sublocality') && !result.city) {
        // Quarta priorità: sublocality (quartieri, ma a volte è la città più specifica)
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
  

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API;
  
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API environment variable is not set');
  }

  const service = useMemo(() => new GooglePlacesService(apiKey), [apiKey]);

  const searchPlaces = useCallback(
    debounce(async (query: string) => {
      if (!query.trim() || query.length < 3) {
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
      try {
        const details = await service.getPlaceDetails(placeId);
        return details;
      } catch (error) {
        console.error('Error getting place details:', error);
        throw error;
      }
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
