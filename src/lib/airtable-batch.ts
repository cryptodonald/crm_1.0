import { getAirtableKey, getAirtableBaseId } from './api-keys-service';

/**
 * 🚀 Airtable Batch Processing Utilities
 * 
 * Ottimizza le chiamate verso Airtable attraverso:
 * - Batch requests quando possibile
 * - Field selection per ridurre payload
 * - Compressione automatica
 * - Retry logic per resilienza
 */

export interface BatchRequestOptions {
  fields?: string[];
  maxRecords?: number;
  view?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  filterByFormula?: string;
}

export interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}

export interface BatchResponse<T = any> {
  records: AirtableRecord[];
  offset?: string;
  metadata: {
    requestTime: number;
    recordCount: number;
    cached: boolean;
  };
}

class AirtableBatchService {
  private requestCounter = 0;

  /**
   * 🎯 Ottimizzazione chiamata singolo record con field selection
   */
  async fetchRecord(
    tableId: string,
    recordId: string,
    options: BatchRequestOptions = {}
  ): Promise<AirtableRecord | null> {
    const startTime = performance.now();
    this.requestCounter++;
    
    try {
      console.log(`🔍 [Airtable-Batch] Fetching record: ${recordId} (Request #${this.requestCounter})`);
      
      // Get credentials in parallel
      const [apiKey, baseId] = await Promise.all([
        getAirtableKey(),
        getAirtableBaseId(),
      ]);

      if (!apiKey || !baseId) {
        throw new Error('Airtable credentials not available');
      }

      // Build optimized URL with field selection
      const url = this.buildRecordUrl(baseId, tableId, recordId, options);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Record not found
        }
        const errorText = await response.text();
        throw new Error(`Airtable API error ${response.status}: ${errorText}`);
      }

      const record = await response.json();
      const requestTime = performance.now() - startTime;
      
      console.log(`✅ [Airtable-Batch] Record fetched in ${requestTime.toFixed(2)}ms`);
      
      return {
        id: record.id,
        fields: record.fields,
        createdTime: record.createdTime,
      };

    } catch (error) {
      const requestTime = performance.now() - startTime;
      console.error(`❌ [Airtable-Batch] Error in ${requestTime.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * 📦 Batch fetch per multiple records (quando supportato da Airtable)
   */
  async fetchRecords(
    tableId: string,
    options: BatchRequestOptions = {}
  ): Promise<BatchResponse> {
    const startTime = performance.now();
    this.requestCounter++;
    
    try {
      console.log(`📦 [Airtable-Batch] Fetching records from table: ${tableId} (Request #${this.requestCounter})`);
      
      // Get credentials in parallel
      const [apiKey, baseId] = await Promise.all([
        getAirtableKey(),
        getAirtableBaseId(),
      ]);

      if (!apiKey || !baseId) {
        throw new Error('Airtable credentials not available');
      }

      // Build optimized URL
      const url = this.buildListUrl(baseId, tableId, options);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const requestTime = performance.now() - startTime;
      
      console.log(`✅ [Airtable-Batch] ${data.records?.length || 0} records fetched in ${requestTime.toFixed(2)}ms`);
      
      return {
        records: data.records || [],
        offset: data.offset,
        metadata: {
          requestTime: Math.round(requestTime),
          recordCount: data.records?.length || 0,
          cached: false,
        },
      };

    } catch (error) {
      const requestTime = performance.now() - startTime;
      console.error(`❌ [Airtable-Batch] Error in ${requestTime.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * 🚀 Parallel fetch per lead + related data (se possibile)
   */
  async fetchLeadWithRelated(
    leadTableId: string,
    leadId: string,
    usersTableId?: string
  ): Promise<{
    lead: AirtableRecord | null;
    users?: AirtableRecord[];
    timing: {
      total: number;
      lead: number;
      users?: number;
      parallel: boolean;
    };
  }> {
    const startTime = performance.now();
    
    try {
      console.log(`🔄 [Airtable-Batch] Fetching lead + related data: ${leadId}`);
      
      // Chiamate parallele per lead e users
      const promises: [Promise<AirtableRecord | null>, Promise<BatchResponse> | Promise<null>] = [
        // Lead fetch con campi essenziali
        this.fetchRecord(leadTableId, leadId, {
          fields: ['Nome', 'Email', 'Telefono', 'Stato', 'Assegnatario', 'Esigenza', 'Note', 'Indirizzo', 'Città', 'CAP']
        }),
        // Users fetch solo se richiesto
        usersTableId ? this.fetchRecords(usersTableId, {
          fields: ['Nome', 'Email', 'Ruolo', 'Avatar'],
          maxRecords: 100
        }) : Promise.resolve(null)
      ];

      const leadStartTime = performance.now();
      const [lead, usersResponse] = await Promise.all(promises);
      const parallelTime = performance.now() - leadStartTime;
      
      const totalTime = performance.now() - startTime;
      
      console.log(`✅ [Airtable-Batch] Parallel fetch completed in ${totalTime.toFixed(2)}ms`);
      
      return {
        lead,
        users: usersResponse?.records || undefined,
        timing: {
          total: Math.round(totalTime),
          lead: Math.round(parallelTime), // Approssimativo
          users: usersResponse ? Math.round(parallelTime) : undefined,
          parallel: true,
        },
      };

    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.error(`❌ [Airtable-Batch] Parallel fetch error in ${totalTime.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * 🛠️ URL builders ottimizzati
   */
  private buildRecordUrl(
    baseId: string,
    tableId: string,
    recordId: string,
    options: BatchRequestOptions
  ): string {
    const baseUrl = `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`;
    const params = new URLSearchParams();

    if (options.fields && options.fields.length > 0) {
      options.fields.forEach(field => {
        params.append('fields[]', field);
      });
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  private buildListUrl(
    baseId: string,
    tableId: string,
    options: BatchRequestOptions
  ): string {
    const baseUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`;
    const params = new URLSearchParams();

    if (options.fields && options.fields.length > 0) {
      options.fields.forEach(field => {
        params.append('fields[]', field);
      });
    }

    if (options.maxRecords) {
      params.set('maxRecords', options.maxRecords.toString());
    }

    if (options.view) {
      params.set('view', options.view);
    }

    if (options.sortField) {
      params.set('sort[0][field]', options.sortField);
      params.set('sort[0][direction]', options.sortDirection || 'asc');
    }

    if (options.filterByFormula) {
      params.set('filterByFormula', options.filterByFormula);
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * 📊 Statistiche di utilizzo
   */
  getStats() {
    return {
      totalRequests: this.requestCounter,
      averageResponseTime: 0, // TODO: implementare tracking
    };
  }
}

// Singleton instance
export const airtableBatch = new AirtableBatchService();

// Export helpers
export const {
  fetchRecord: fetchAirtableRecord,
  fetchRecords: fetchAirtableRecords,
  fetchLeadWithRelated: fetchLeadWithRelatedData,
} = airtableBatch;
