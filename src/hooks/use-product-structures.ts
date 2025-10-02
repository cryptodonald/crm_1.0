import { useState, useEffect } from 'react';

export interface ProductStructureFromAPI {
  id: string;
  name: string;
  description: string;
  active: boolean;
  fields: any[];
  created_at: string;
  updated_at: string;
}

export interface UseProductStructuresReturn {
  structures: ProductStructureFromAPI[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProductStructures(): UseProductStructuresReturn {
  const [structures, setStructures] = useState<ProductStructureFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStructures = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🏗️ [useProductStructures] Fetching structures from API...');
      
      const response = await fetch('/api/product-structures');
      
      console.log('🔍 [useProductStructures] Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [useProductStructures] Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 [useProductStructures] Raw response data:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      console.log('✅ [useProductStructures] Loaded structures:', data.structures?.length || 0, data.structures);
      setStructures(data.structures || []);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [useProductStructures] Error:', errorMessage);
      setError(errorMessage);
      setStructures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, []);

  return {
    structures,
    loading,
    error,
    refresh: fetchStructures,
  };
}