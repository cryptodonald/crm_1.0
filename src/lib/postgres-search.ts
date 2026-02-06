/**
 * POSTGRES FULL-TEXT SEARCH
 * 
 * Search ottimizzato con:
 * - FTS italiano (tsvector + GIN index)
 * - Ranking risultati (ts_rank)
 * - Cache Redis
 * - Fallback fuzzy search
 * 
 * Performance target: <200ms
 */

import { Pool } from 'pg';
import { cachedQuery, CacheKeys, CacheTTL } from './redis-cache';

// Postgres pool (riutilizza da data-source.ts)
let pgPool: Pool | null = null;

export function getPgPool(): Pool {
  if (!pgPool) {
    pgPool = new Pool({
      host: 'aws-1-us-east-1.pooler.supabase.com',
      database: 'postgres',
      user: 'postgres.occtinunulzhbjjvztcj',
      password: process.env.POSTGRES_PASSWORD!,
      port: 5432,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pgPool;
}

/**
 * LEADS SEARCH
 */

export interface LeadSearchResult {
  id: string;
  airtable_id: string;
  Nome?: string;
  Telefono?: string;
  Email?: string;
  Città?: string;
  Stato?: string;
  Data?: string;
  Esigenza?: string;
  rank: number; // Relevance score
}

/**
 * Search lead con FTS ottimizzato
 * 
 * @param query - Query utente (es: "mario rossi milano")
 * @param limit - Max risultati (default 20)
 * @returns Lead ordinati per relevance
 * 
 * @example
 * const results = await searchLeads('mario rossi');
 * // Trova: "Mario Rossi", "Rossi Mario", "MARIO ROSSI"
 * // Latency: 80-150ms (vs 4000ms Airtable)
 */
export async function searchLeads(
  query: string,
  limit = 20
): Promise<LeadSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  const normalizedQuery = query.trim().toLowerCase();
  const cacheKey = CacheKeys.leadsSearch(normalizedQuery);
  
  return cachedQuery(
    cacheKey,
    CacheTTL.search,
    async () => {
      const pool = getPgPool();
      
      // Converti query in tsquery format: "mario rossi" → "mario & rossi"
      const tsquery = normalizedQuery.split(/\s+/).join(' & ');
      
      try {
        // FTS con ranking
        const result = await pool.query(`
          SELECT 
            id,
            airtable_id,
            "Nome",
            "Telefono",
            "Email",
            "Città",
            "Stato",
            "Data",
            "Esigenza",
            ts_rank(search_vector, query) AS rank
          FROM leads, 
               to_tsquery('italian', $1) query
          WHERE search_vector @@ query
          ORDER BY rank DESC, "Data" DESC
          LIMIT $2
        `, [tsquery, limit]);
        
        return result.rows;
        
      } catch (error: any) {
        console.error('[SearchLeads] FTS error:', error.message);
        
        // Fallback: ILIKE fuzzy search (più lento ma funziona sempre)
        const likePattern = `%${normalizedQuery}%`;
        const fallbackResult = await pool.query(`
          SELECT 
            id,
            airtable_id,
            "Nome",
            "Telefono",
            "Email",
            "Città",
            "Stato",
            "Data",
            "Esigenza",
            0.5 AS rank
          FROM leads
          WHERE 
            "Nome" ILIKE $1 OR
            "Telefono" ILIKE $1 OR
            "Email" ILIKE $1 OR
            "Città" ILIKE $1
          ORDER BY "Data" DESC
          LIMIT $2
        `, [likePattern, limit]);
        
        return fallbackResult.rows;
      }
    }
  );
}

/**
 * ACTIVITIES SEARCH
 */

export interface ActivitySearchResult {
  id: string;
  airtable_id: string;
  Titolo?: string;
  Tipo?: string;
  Data?: string;
  Esito?: string;
  Note?: string;
  Lead?: string[]; // JSONB array
  rank: number;
}

export async function searchActivities(
  query: string,
  leadId?: string,
  limit = 20
): Promise<ActivitySearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  const normalizedQuery = query.trim().toLowerCase();
  const cacheKey = leadId 
    ? `activities:search:${leadId}:${normalizedQuery}` 
    : CacheKeys.leadsSearch(`activities:${normalizedQuery}`);
  
  return cachedQuery(
    cacheKey,
    CacheTTL.search,
    async () => {
      const pool = getPgPool();
      const tsquery = normalizedQuery.split(/\s+/).join(' & ');
      
      try {
        let sql = `
          SELECT 
            id,
            airtable_id,
            "Titolo",
            "Tipo",
            "Data",
            "Esito",
            "Note",
            "ID Lead" AS "Lead",
            ts_rank(search_vector, query) AS rank
          FROM activities, 
               to_tsquery('italian', $1) query
          WHERE search_vector @@ query
        `;
        
        const params: any[] = [tsquery];
        
        // Filtro per leadId se specificato
        if (leadId) {
          sql += ` AND "ID Lead" @> $${params.length + 1}::jsonb`;
          params.push(JSON.stringify([leadId]));
        }
        
        sql += ` ORDER BY rank DESC, "Data" DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        
        const result = await pool.query(sql, params);
        
        return result.rows.map(row => ({
          ...row,
          Lead: row.Lead ? JSON.parse(row.Lead) : undefined,
        }));
        
      } catch (error: any) {
        console.error('[SearchActivities] FTS error:', error.message);
        
        // Fallback ILIKE
        const likePattern = `%${normalizedQuery}%`;
        let fallbackSql = `
          SELECT 
            id,
            airtable_id,
            "Titolo",
            "Tipo",
            "Data",
            "Esito",
            "Note",
            "ID Lead" AS "Lead",
            0.5 AS rank
          FROM activities
          WHERE 
            "Titolo" ILIKE $1 OR
            "Note" ILIKE $1 OR
            "Tipo" ILIKE $1
        `;
        
        const fallbackParams: any[] = [likePattern];
        
        if (leadId) {
          fallbackSql += ` AND "ID Lead" @> $${fallbackParams.length + 1}::jsonb`;
          fallbackParams.push(JSON.stringify([leadId]));
        }
        
        fallbackSql += ` ORDER BY "Data" DESC LIMIT $${fallbackParams.length + 1}`;
        fallbackParams.push(limit);
        
        const fallbackResult = await pool.query(fallbackSql, fallbackParams);
        
        return fallbackResult.rows.map(row => ({
          ...row,
          Lead: row.Lead ? JSON.parse(row.Lead) : undefined,
        }));
      }
    }
  );
}

/**
 * PRODUCTS SEARCH
 */

export interface ProductSearchResult {
  id: string;
  airtable_id: string;
  Nome_Prodotto?: string;
  Descrizione?: string;
  Categoria?: string;
  Codice_Matrice?: string;
  Prezzo_Listino_Attuale?: number;
  rank: number;
}

export async function searchProducts(
  query: string,
  limit = 20
): Promise<ProductSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  const normalizedQuery = query.trim().toLowerCase();
  const cacheKey = `products:search:${normalizedQuery}`;
  
  return cachedQuery(
    cacheKey,
    CacheTTL.search,
    async () => {
      const pool = getPgPool();
      const tsquery = normalizedQuery.split(/\s+/).join(' & ');
      
      try {
        const result = await pool.query(`
          SELECT 
            id,
            airtable_id,
            "Nome_Prodotto",
            "Descrizione",
            "Categoria",
            "Codice_Matrice",
            "Prezzo_Listino_Attuale",
            ts_rank(search_vector, query) AS rank
          FROM products, 
               to_tsquery('italian', $1) query
          WHERE search_vector @@ query
          ORDER BY rank DESC
          LIMIT $2
        `, [tsquery, limit]);
        
        return result.rows;
        
      } catch (error: any) {
        console.error('[SearchProducts] FTS error:', error.message);
        
        // Fallback ILIKE
        const likePattern = `%${normalizedQuery}%`;
        const fallbackResult = await pool.query(`
          SELECT 
            id,
            airtable_id,
            "Nome_Prodotto",
            "Descrizione",
            "Categoria",
            "Codice_Matrice",
            "Prezzo_Listino_Attuale",
            0.5 AS rank
          FROM products
          WHERE 
            "Nome_Prodotto" ILIKE $1 OR
            "Descrizione" ILIKE $1 OR
            "Categoria" ILIKE $1 OR
            "Codice_Matrice" ILIKE $1
          ORDER BY "Nome_Prodotto"
          LIMIT $2
        `, [likePattern, limit]);
        
        return fallbackResult.rows;
      }
    }
  );
}

/**
 * ORDERS SEARCH
 */

export interface OrderSearchResult {
  id: string;
  airtable_id: string;
  ID_Ordine?: string;
  Data_Ordine?: string;
  Stato_Ordine?: string;
  Totale_Finale?: number;
  ID_Lead?: string[]; // JSONB
  rank: number;
}

export async function searchOrders(
  query: string,
  limit = 20
): Promise<OrderSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  const normalizedQuery = query.trim().toLowerCase();
  const cacheKey = `orders:search:${normalizedQuery}`;
  
  return cachedQuery(
    cacheKey,
    CacheTTL.search,
    async () => {
      const pool = getPgPool();
      const tsquery = normalizedQuery.split(/\s+/).join(' & ');
      
      try {
        const result = await pool.query(`
          SELECT 
            id,
            airtable_id,
            "ID_Ordine",
            "Data_Ordine",
            "Stato_Ordine",
            "Totale_Finale",
            "ID_Lead",
            ts_rank(search_vector, query) AS rank
          FROM orders, 
               to_tsquery('italian', $1) query
          WHERE search_vector @@ query
          ORDER BY rank DESC, "Data_Ordine" DESC
          LIMIT $2
        `, [tsquery, limit]);
        
        return result.rows.map(row => ({
          ...row,
          ID_Lead: row.ID_Lead ? JSON.parse(row.ID_Lead) : undefined,
        }));
        
      } catch (error: any) {
        console.error('[SearchOrders] FTS error:', error.message);
        
        // Fallback ILIKE
        const likePattern = `%${normalizedQuery}%`;
        const fallbackResult = await pool.query(`
          SELECT 
            id,
            airtable_id,
            "ID_Ordine",
            "Data_Ordine",
            "Stato_Ordine",
            "Totale_Finale",
            "ID_Lead",
            0.5 AS rank
          FROM orders
          WHERE 
            "ID_Ordine" ILIKE $1 OR
            "Note_Cliente" ILIKE $1 OR
            "Note_Interne" ILIKE $1 OR
            "Stato_Ordine" ILIKE $1
          ORDER BY "Data_Ordine" DESC
          LIMIT $2
        `, [likePattern, limit]);
        
        return fallbackResult.rows.map(row => ({
          ...row,
          ID_Lead: row.ID_Lead ? JSON.parse(row.ID_Lead) : undefined,
        }));
      }
    }
  );
}

/**
 * GLOBAL SEARCH (cerca in tutte le entity)
 */

export interface GlobalSearchResults {
  leads: LeadSearchResult[];
  activities: ActivitySearchResult[];
  products: ProductSearchResult[];
  orders: OrderSearchResult[];
  totalResults: number;
  duration: number;
}

export async function globalSearch(
  query: string,
  limitPerEntity = 5
): Promise<GlobalSearchResults> {
  const startTime = Date.now();
  
  // Ricerca parallela su tutte le entity
  const [leads, activities, products, orders] = await Promise.all([
    searchLeads(query, limitPerEntity),
    searchActivities(query, undefined, limitPerEntity),
    searchProducts(query, limitPerEntity),
    searchOrders(query, limitPerEntity),
  ]);
  
  return {
    leads,
    activities,
    products,
    orders,
    totalResults: leads.length + activities.length + products.length + orders.length,
    duration: Date.now() - startTime,
  };
}
