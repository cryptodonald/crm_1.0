// Cache in memoria per i leads
interface CacheEntry {
  data: any[];
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class LeadsCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 2 * 60 * 1000; // 2 minuti di cache

  set(key: string, data: any[], ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get(key: string): any[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Genera chiave cache basata sui parametri di filtro
  generateKey(searchParams: URLSearchParams): string {
    // Rimuovi parametri che non influenzano la cache Airtable
    const relevantParams = new URLSearchParams();
    
    // Solo i parametri che cambiano il dataset da Airtable
    // Escludiamo _forceRefresh perché è solo un cache-busting parameter
    const filterParams = ['stato', 'provenienza', 'dataInizio', 'dataFine', 'citta', 'sortField', 'sortDirection'];
    
    for (const param of filterParams) {
      const values = searchParams.getAll(param);
      for (const value of values) {
        relevantParams.append(param, value);
      }
    }

    return relevantParams.toString();
  }
}

// Singleton instance
export const leadsCache = new LeadsCache();
