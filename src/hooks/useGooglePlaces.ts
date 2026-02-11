'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { debounce } from 'lodash';

/**
 * Google Maps API v2 (New Places API)
 * Dichiarazioni globali per le nuove classi della Places API
 */
declare global {
  interface Window {
    google?: {
      maps: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        importLibrary: (name: string) => Promise<any>;
      };
    };
  }
}

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

/**
 * Loader per Google Maps Platform v2
 * Usa il nuovo formato della API di Google (Places Library v2)
 */
class GoogleMapsLoader {
  private static instance: GoogleMapsLoader;
  private apiKey: string;
  private loadPromise: Promise<void> | null = null;

  private constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  static getInstance(apiKey: string): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader(apiKey);
    }
    return GoogleMapsLoader.instance;
  }

  /**
   * Carica la Google Maps API v2 con la libreria Places
   * Usa il nuovo formato di Google (callback per initializer)
   */
  async load(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window not available'));
        return;
      }

      // Verifica se già caricato
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).google?.maps?.importLibrary) {
        resolve();
        return;
      }

      // Crea il script per caricare Google Maps API v2
      const script = document.createElement('script');
      // IMPORTANTE: Usa il nuovo callback initializer con loading=async
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&callback=initGoogleMapsCallback&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;

      // Callback globale per l'API v2
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).initGoogleMapsCallback = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).google?.maps?.importLibrary) {
          resolve();
        } else {
          reject(new Error('Google Maps API loaded but importLibrary not available'));
        }
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API script'));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }
}

class GooglePlacesService {
  private apiKey: string;
  private loader: GoogleMapsLoader;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.loader = GoogleMapsLoader.getInstance(apiKey);
  }

  private async ensureLoaded(): Promise<void> {
    await this.loader.load();
  }


  async searchPlaces(query: string): Promise<PlaceResult[]> {
    if (!query || query.length < 3) return [];

    await this.ensureLoaded();

    try {
      // Importa la libreria Places dalla nuova API v2
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { AutocompleteSuggestion } = await (window as any).google.maps.importLibrary('places');
      
      // Chiama l'API con i parametri corretti per la nuova versione
      // NOTA: v2 API non supporta languagePreference/languageCode nel fetchAutocompleteSuggestions
      // La lingua è determinata dalle impostazioni browser/locale
      const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        includedRegionCodes: ['IT', 'SM'], // Italia e San Marino (filtro principale per lingua)
        // includedPrimaryTypes non supportato in v2 per 'address' - rimosso
      });

      if (!response.suggestions || response.suggestions.length === 0) {
        return [];
      }

      const results: PlaceResult[] = response.suggestions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((suggestion: any) => suggestion.placePrediction) // Filtra risposte valide
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((suggestion: any) => {
          const placePrediction = suggestion.placePrediction;
          return {
            placeId: placePrediction.placeId,
            description: placePrediction.text?.text || '',
            structuredFormatting: {
              mainText: placePrediction.structuredFormat?.mainText?.text || placePrediction.text?.text || '',
              secondaryText: placePrediction.structuredFormat?.secondaryText?.text || '',
            },
          };
        });

      return results;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('[GooglePlaces] Search error:', error);
      if (error?.message?.includes('ZERO_RESULTS')) {
        return [];
      }
      // Non lanciare l'errore, ritorna array vuoto per graceful degradation
      return [];
    }
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    await this.ensureLoaded();

    try {
      // Importa la libreria Places dalla nuova API v2
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { Place } = await (window as any).google.maps.importLibrary('places');
      
      // NOTA: v2 API usa 'requestedLanguage' (verificare documentazione Google ufficiale)
      const place = new Place({
        id: placeId,
        requestedLanguage: 'it', // Verificare se è il parametro corretto per v2
      });

      // Richiedi i campi necessari
      await place.fetchFields({
        fields: ['formattedAddress', 'addressComponents'],
      });

      const details: PlaceDetails = {
        formattedAddress: place.formattedAddress || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addressComponents: (place.addressComponents || []).map((component: any) => ({
          longName: component.longText,
          shortName: component.shortText,
          types: component.types,
        })),
      };

      return details;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('[GooglePlaces] Get details error:', error);
      // Ritorna dettagli vuoti piuttosto che lanciare errore
      return {
        formattedAddress: '',
        addressComponents: [],
      };
    }
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

  // Supporta entrambi i nomi della variabile d'ambiente
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API;

  // Debug logging (solo warn, nessun log se configurato)
  useEffect(() => {
    if (!apiKey) {
      console.warn('⚠️ [useGooglePlaces] Google Maps API key not configured (NEXT_PUBLIC_GOOGLE_MAPS_API or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)');
    }
  }, [apiKey]);

  // Se manca la chiave, degrada in modo elegante: nessun autocomplete, nessun throw
  const service = useMemo(() => (apiKey ? new GooglePlacesService(apiKey) : null), [apiKey]);

  // Crea il debounced search function
  const debouncedSearch = useMemo(
    () => debounce(async (query: string) => {
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

  // Wrapped per esporre il debounced function
  const searchPlaces = useCallback(
    (query: string) => debouncedSearch(query),
    [debouncedSearch]
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

  // Cleanup per il debounce quando il componente si smonta
  useEffect(() => {
    return () => {
      if (debouncedSearch && typeof debouncedSearch.cancel === 'function') {
        debouncedSearch.cancel();
      }
    };
  }, [debouncedSearch]);

  return {
    searchPlaces,
    getPlaceDetails,
    parseAddressComponents,
    isSearching,
    suggestions,
    clearSuggestions: () => setSuggestions([]),
  };
}
