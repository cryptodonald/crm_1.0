declare global {
  interface Window {
    google: typeof google;
  }

  namespace google {
    namespace maps {
      namespace places {
        class PlacesService {
          constructor(attrContainer: HTMLDivElement | google.maps.Map);
          getDetails(
            request: google.maps.places.PlaceDetailsRequest,
            callback: (
              result: google.maps.places.PlaceResult | null,
              status: google.maps.places.PlacesServiceStatus
            ) => void
          ): void;
        }

        class AutocompleteService {
          constructor();
          getPlacePredictions(
            request: google.maps.places.AutocompletionRequest,
            callback: (
              result: google.maps.places.AutocompletePrediction[] | null,
              status: google.maps.places.PlacesServiceStatus
            ) => void
          ): void;
        }

        interface PlaceDetailsRequest {
          placeId: string;
          fields?: string[];
        }

        interface AutocompletionRequest {
          input: string;
          componentRestrictions?: google.maps.places.ComponentRestrictions;
          types?: string[];
        }

        interface ComponentRestrictions {
          country?: string | string[];
        }

        interface PlaceResult {
          formatted_address?: string;
          address_components?: google.maps.GeocoderAddressComponent[];
          geometry?: google.maps.places.PlaceGeometry;
          place_id?: string;
        }

        interface AutocompletePrediction {
          place_id: string;
          description: string;
          structured_formatting?: {
            main_text: string;
            secondary_text: string;
          };
        }

        interface PlaceGeometry {
          location?: google.maps.LatLng;
        }

        enum PlacesServiceStatus {
          OK = 'OK',
          ZERO_RESULTS = 'ZERO_RESULTS',
          OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
          REQUEST_DENIED = 'REQUEST_DENIED',
          INVALID_REQUEST = 'INVALID_REQUEST',
          NOT_FOUND = 'NOT_FOUND',
        }
      }

      interface GeocoderAddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }

      class LatLng {
        constructor(lat: number, lng: number);
        lat(): number;
        lng(): number;
      }

      class Map {
        constructor(mapDiv: HTMLElement, opts?: google.maps.MapOptions);
      }

      interface MapOptions {
        center?: google.maps.LatLng;
        zoom?: number;
      }
    }
  }
}

export {};
