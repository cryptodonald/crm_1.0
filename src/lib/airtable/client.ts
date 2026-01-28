/**
 * Advanced Airtable Client
 * Enterprise-grade Airtable integration with type safety and error handling
 */

import { env } from '@/lib/env';

// Base types
export interface AirtableRecord<T = Record<string, unknown>> {
  id: string;
  fields: T;
  createdTime: string;
}

export interface AirtableListResponse<T = Record<string, unknown>> {
  records: AirtableRecord<T>[];
  offset?: string;
}

export interface AirtableQueryParams {
  filterByFormula?: string;
  sort?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  maxRecords?: number;
  offset?: string;
  view?: string;
  fields?: string[];
  cellFormat?: 'json' | 'string';
  timeZone?: string;
  userLocale?: string;
}

/**
 * Advanced Airtable Client with comprehensive error handling and retry logic
 */
export class AirtableClient {
  private apiKey: string;
  private baseId: string;
  private baseUrl: string;

  // Rate limiting
  private lastRequestTime = 0;
  private readonly requestInterval = 200; // 5 requests per second max

  constructor(apiKey?: string, baseId?: string) {
    // Deprecato: MAI usare env direttamente
    // Accetta credenziali per testing e route API dinamiche
    if (!apiKey || !baseId) {
      throw new Error(
        'AirtableClient: apiKey and baseId are required. Use API Key Service instead: getAirtableClient() with async init'
      );
    }
    this.apiKey = apiKey;
    this.baseId = baseId;
    this.baseUrl = `https://api.airtable.com/v0/${this.baseId}`;
  }

  /**
   * Get headers for Airtable requests
   */
  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'CRM-1.0/1.0.0',
    };
  }

  /**
   * Rate limiting with exponential backoff
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.requestInterval) {
      const delay = this.requestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Make HTTP request with retry logic and error handling
   */
  private async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<T> {
    await this.rateLimit();

    const url = `${this.baseUrl}${endpoint}`;
    const headers = { ...this.getHeaders(), ...options.headers };

    const requestOptions: RequestInit = {
      ...options,
      headers,
      // Disable caching for dynamic data
      cache: 'no-store',
    };

    try {
      const response = await fetch(url, requestOptions);

      // Handle different HTTP status codes
      if (!response.ok) {
        const errorText = await response.text();

        switch (response.status) {
          case 401:
            throw new Error('Unauthorized: Check your Airtable API key');
          case 403:
            throw new Error('Forbidden: Insufficient permissions');
          case 404:
            throw new Error('Not Found: Table or record does not exist');
          case 422:
            throw new Error(`Invalid Request: ${errorText}`);
          case 429:
            // Rate limited - retry with exponential backoff
            if (retries > 0) {
              const delay = Math.pow(2, 4 - retries) * 1000; // 2s, 4s, 8s
              await new Promise(resolve => setTimeout(resolve, delay));
              return this.request<T>(endpoint, options, retries - 1);
            }
            throw new Error('Rate limited: Too many requests');
          default:
            throw new Error(
              `Airtable API error ${response.status}: ${errorText}`
            );
        }
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      // Retry on network errors
      if (
        retries > 0 &&
        (error instanceof TypeError ||
          (error instanceof Error && error.message.includes('fetch')))
      ) {
        const delay = Math.pow(2, 4 - retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request<T>(endpoint, options, retries - 1);
      }

      throw error;
    }
  }

  /**
   * Build query string from parameters
   */
  private buildQueryString(params: AirtableQueryParams): string {
    const searchParams = new URLSearchParams();

    if (params.filterByFormula) {
      searchParams.set('filterByFormula', params.filterByFormula);
    }

    if (params.sort) {
      params.sort.forEach((sort, index) => {
        searchParams.set(`sort[${index}][field]`, sort.field);
        searchParams.set(`sort[${index}][direction]`, sort.direction);
      });
    }

    if (params.maxRecords) {
      searchParams.set('maxRecords', params.maxRecords.toString());
    }

    if (params.offset) {
      searchParams.set('offset', params.offset);
    }

    if (params.view) {
      searchParams.set('view', params.view);
    }

    if (params.fields) {
      params.fields.forEach(field => {
        searchParams.append('fields[]', field);
      });
    }

    if (params.cellFormat) {
      searchParams.set('cellFormat', params.cellFormat);
    }

    if (params.timeZone) {
      searchParams.set('timeZone', params.timeZone);
    }

    if (params.userLocale) {
      searchParams.set('userLocale', params.userLocale);
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * List records with automatic pagination
   */
  async list<T = Record<string, unknown>>(
    tableId: string,
    params: AirtableQueryParams = {}
  ): Promise<AirtableRecord<T>[]> {
    const allRecords: AirtableRecord<T>[] = [];
    let offset: string | undefined;

    do {
      const currentParams = { ...params, offset };
      const queryString = this.buildQueryString(currentParams);

      const response = await this.request<AirtableListResponse<T>>(
        `/${tableId}${queryString}`
      );

      allRecords.push(...response.records);
      offset = response.offset;
    } while (offset);

    return allRecords;
  }

  /**
   * Get single record by ID
   */
  async get<T = Record<string, unknown>>(
    tableId: string,
    recordId: string
  ): Promise<AirtableRecord<T>> {
    return this.request<AirtableRecord<T>>(`/${tableId}/${recordId}`);
  }

  /**
   * Create single record
   */
  async create<T = Record<string, unknown>>(
    tableId: string,
    fields: Partial<T>
  ): Promise<AirtableRecord<T>> {
    const response = await this.request<{ records: AirtableRecord<T>[] }>(
      `/${tableId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          records: [{ fields }],
        }),
      }
    );

    return response.records[0]!;
  }

  /**
   * Update single record
   */
  async update<T = Record<string, unknown>>(
    tableId: string,
    recordId: string,
    fields: Partial<T>
  ): Promise<AirtableRecord<T>> {
    const response = await this.request<{ records: AirtableRecord<T>[] }>(
      `/${tableId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          records: [
            {
              id: recordId,
              fields,
            },
          ],
        }),
      }
    );

    return response.records[0]!;
  }

  /**
   * Delete single record
   */
  async delete(
    tableId: string,
    recordId: string
  ): Promise<{ id: string; deleted: boolean }> {
    const params = new URLSearchParams();
    params.append('records[]', recordId);

    const response = await this.request<{
      records: Array<{ id: string; deleted: boolean }>;
    }>(`/${tableId}?${params.toString()}`, { method: 'DELETE' });

    return response.records[0]!;
  }
}

/**
 * Factory function to create Airtable client with dynamic credentials
 * ALWAYS use this in API routes instead of direct instantiation
 * 
 * Usage in API routes:
 * const client = await createAirtableClientFromKV();
 * const records = await client.list(tableId);
 */
export async function createAirtableClientFromKV(): Promise<AirtableClient> {
  // Read credentials directly from environment variables (Vercel)
  // No longer using KV storage for secrets
  const { env } = await import('@/env');
  
  const apiKey = env.AIRTABLE_API_KEY;
  const baseId = env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    throw new Error('Failed to initialize Airtable client: missing API key or base ID in environment variables');
  }

  return new AirtableClient(apiKey, baseId);
}

// Singleton instance (deprecated)
let clientInstance: AirtableClient | null = null;

/**
 * Get Airtable client instance (singleton pattern)
 * DEPRECATED: Use createAirtableClientFromKV() in API routes
 * This function is kept for backward compatibility only
 */
export function getAirtableClient(): AirtableClient {
  throw new Error(
    'getAirtableClient() is deprecated. Use createAirtableClientFromKV() in API routes or pass credentials explicitly.'
  );
}

// Utility functions for common operations

/**
 * Build OR filter for multiple values
 */
export function buildOrFilter(field: string, values: string[]): string | null {
  const safeValues = values.filter(Boolean).map(v => {
    const escaped = String(v).replace(/'/g, "\\\\'");
    return `'${escaped}'`;
  });

  if (safeValues.length === 0) return null;
  if (safeValues.length === 1) return `{${field}} = ${safeValues[0]!}`;

  return `OR(${safeValues.map(v => `{${field}} = ${v}`).join(',')})`;
}

/**
 * Build date range filter
 */
export function buildDateRangeFilter(
  field: string,
  startDate?: string,
  endDate?: string
): string | null {
  const clauses: string[] = [];

  if (startDate) {
    clauses.push(`IS_AFTER({${field}}, '${startDate}')`);
  }

  if (endDate) {
    clauses.push(`IS_BEFORE({${field}}, '${endDate}')`);
  }

  if (clauses.length === 0) return null;
  if (clauses.length === 1) return clauses[0]!;

  return `AND(${clauses.join(', ')})`;
}

/**
 * Build search filter for multiple fields
 */
export function buildSearchFilter(
  query: string,
  fields: string[]
): string | null {
  if (!query.trim()) return null;

  const escaped = query.replace(/'/g, "\\\\'");
  const searchClauses = fields.map(
    field => `FIND(LOWER('${escaped}'), LOWER({${field}})) > 0`
  );

  return `OR(${searchClauses.join(', ')})`;
}
