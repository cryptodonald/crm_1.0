// Cache in memoria per le attività
interface CacheEntry {
  data: any[];
  timestamp: number;
  ttl: number;
}

class ActivitiesCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 2 * 60 * 1000; // 2 minuti

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

  // Genera chiave cache evitando parametri non rilevanti (es. offset)
  generateKey(searchParams: URLSearchParams): string {
    const relevant = new URLSearchParams();
    const filterParams = [
      'leadId',
      'stato',
      'tipo',
      'obiettivo',
      'priorita',
      'dataInizio',
      'dataFine',
      'assegnatario',
      'search',
      'sortField',
      'sortDirection',
      'maxRecords',
      'loadAll',
    ];
    for (const key of filterParams) {
      const values = searchParams.getAll(key);
      for (const v of values) relevant.append(key, v);
    }
    return relevant.toString();
  }
}

export const activitiesCache = new ActivitiesCache();

