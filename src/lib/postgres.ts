/**
 * PostgreSQL Client & Query Helpers
 * 
 * Provides CRUD operations for all CRM tables with:
 * - Connection pooling (via Supabase)
 * - Type-safe queries
 * - Error handling
 * - FTS search support
 */

import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcrypt';
import { getOrSet, TTL, invalidate } from './cache';
import { ENTITY_TYPE_TO_DB } from './color-preferences';
import { memoryCache } from './memory-cache';
import type {
  Lead,
  LeadCreateInput,
  LeadUpdateInput,
  LeadFilters,
  Activity,
  ActivityCreateInput,
  ActivityUpdateInput,
  ActivityFilters,
  Note,
  NoteCreateInput,
  NoteUpdateInput,
  User,
  UserCreateInput,
  UserUpdateInput,
  MarketingSource,
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  TaskFilters,
  PaginatedResponse,
  UUID,
} from '@/types/database';

// ============================================================================
// Connection Pool
// ============================================================================

let pool: Pool | null = null;
let isWarmedUp = false;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL;
    
    if (!connectionString) {
      throw new Error('POSTGRES_URL environment variable not set');
    }

    console.log('[Postgres] Initializing connection pool...');

    pool = new Pool({
      connectionString,
      max: 20,
      min: 2, // Keep 2 connections alive (warm pool)
      idleTimeoutMillis: 60000, // Keep connections idle longer
      connectionTimeoutMillis: 10000, // Reduce timeout after warm-up
      statement_timeout: 30000,
      ssl: {
        rejectUnauthorized: true, // Supabase requires proper SSL validation
      },
    });

    // Error handling
    pool.on('error', (err) => {
      console.error('[Postgres] Unexpected pool error:', err);
    });

    // Warm-up: create initial connections
    if (!isWarmedUp) {
      isWarmedUp = true;
      (async () => {
        try {
          const warmupStart = Date.now();
          await pool!.query('SELECT 1');
          console.log(`[Postgres] Pool warmed up in ${Date.now() - warmupStart}ms`);
        } catch (error) {
          console.error('[Postgres] Warm-up failed:', error);
        }
      })();
    }
  }

  return pool;
}

/**
 * Execute a query with automatic connection management
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * Execute a query and return single result
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

/**
 * Get a client for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

// ============================================================================
// LEADS
// ============================================================================

export async function getLeads(filters: LeadFilters = {}): Promise<PaginatedResponse<Lead>> {
  const startTime = Date.now();
  
  // Cache key based on filters
  const cacheKey = `leads:page:${filters.page || 1}:${filters.limit || 50}:${JSON.stringify(filters)}`;
  
  // Use memory cache in dev, Redis in prod
  const isDev = process.env.NODE_ENV === 'development';
  const cacheGetStart = Date.now();
  
  // Try memory cache first in dev (instant!)
  if (isDev) {
    const memCached = await memoryCache.get<PaginatedResponse<Lead>>(cacheKey);
    if (memCached) {
      const hitDuration = Date.now() - cacheGetStart;
      console.log(`[MemCache] HIT in ${hitDuration}ms`);
      return memCached;
    }
  }
  
  // Cache miss - fetch from DB
  const dbStart = Date.now();
  const result = await (async () => {
  
  const {
    page = 1,
    limit = 50,
    status,
    source_id,
    assigned_to,
    city,
    search,
    dateFrom,
    dateTo,
    sort_by = 'created_at',
    sort_order = 'desc',
  } = filters;

  const offset = (page - 1) * limit;
  const whereClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Filters
  if (status) {
    if (Array.isArray(status)) {
      whereClauses.push(`status = ANY($${paramIndex})`);
      params.push(status);
    } else {
      whereClauses.push(`status = $${paramIndex}`);
      params.push(status);
    }
    paramIndex++;
  }

  if (source_id) {
    whereClauses.push(`source_id = $${paramIndex}`);
    params.push(source_id);
    paramIndex++;
  }

  if (assigned_to) {
    whereClauses.push(`$${paramIndex} = ANY(assigned_to)`);
    params.push(assigned_to);
    paramIndex++;
  }

  if (city) {
    whereClauses.push(`city ILIKE $${paramIndex}`);
    params.push(`%${city}%`);
    paramIndex++;
  }

  // Date range filter
  if (dateFrom) {
    whereClauses.push(`created_at >= $${paramIndex}`);
    params.push(dateFrom);
    paramIndex++;
  }
  
  if (dateTo) {
    whereClauses.push(`created_at <= $${paramIndex}`);
    params.push(dateTo);
    paramIndex++;
  }

  // Trigram search for true partial matching (fuzzy + typo-tolerant)
  // Uses pg_trgm extension - much better than FTS for partial matches
  if (search) {
    const searchPattern = `%${search}%`;
    whereClauses.push(`(
      name ILIKE $${paramIndex} OR
      phone ILIKE $${paramIndex} OR
      email ILIKE $${paramIndex} OR
      city ILIKE $${paramIndex}
    )`);
    params.push(searchPattern);
    paramIndex++;
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count total - use fast estimate for no filters, accurate count for filtered queries
  let total: number;
  
  if (!whereClause) {
    // Fast path: use pg_class stats for unfiltered count (instant!)
    const estimateSql = `
      SELECT reltuples::bigint AS estimate 
      FROM pg_class 
      WHERE relname = 'leads'
    `;
    const estimateResult = await queryOne<{ estimate: string }>(estimateSql);
    total = parseInt(estimateResult?.estimate || '0', 10);
  } else {
    // Filtered query: need accurate count
    const countSql = `SELECT COUNT(*) as total FROM leads ${whereClause}`;
    const countResult = await queryOne<{ total: string }>(countSql, params);
    total = parseInt(countResult?.total || '0', 10);
  }

  // Fetch data with activities count + referral lead info (scalar subqueries)
  // This applies WHERE/LIMIT first, THEN counts/fetches only for returned leads
  const dataSql = `
    SELECT 
      l.*,
      (SELECT COUNT(*) FROM activities WHERE lead_id = l.id) as activities_count,
      (SELECT name FROM leads WHERE id = l.referral_lead_id) as referral_lead_name,
      (SELECT gender FROM leads WHERE id = l.referral_lead_id) as referral_lead_gender
    FROM leads l
    ${whereClause}
    ORDER BY l.${sort_by} ${sort_order}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);
  
  const data = await query<Lead>(dataSql, params);
  
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  })();
  
  const dbDuration = Date.now() - dbStart;
  console.log(`[Postgres] DB query completed in ${dbDuration}ms`);
  
  // Store in appropriate cache
  if (isDev) {
    await memoryCache.set(cacheKey, result, TTL.LIST);
    console.log(`[MemCache] SET (size: ${memoryCache.getStats().size} keys)`);
  } else {
    // Production: use Redis
    await getOrSet(cacheKey, async () => result, TTL.LIST);
  }
  
  const totalDuration = Date.now() - startTime;
  console.log(`[getLeads] Total: ${totalDuration}ms`);
  
  return result;
}

export async function getLeadById(id: UUID): Promise<Lead | null> {
  const sql = `SELECT * FROM leads WHERE id = $1`;
  return queryOne<Lead>(sql, [id]);
}

export async function createLead(input: LeadCreateInput): Promise<Lead> {
  const fields = Object.keys(input);
  const values = Object.values(input);
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `
    INSERT INTO leads (${fields.join(', ')}, created_at, updated_at)
    VALUES (${placeholders}, NOW(), NOW())
    RETURNING *
  `;

  const lead = await queryOne<Lead>(sql, values);
  if (!lead) throw new Error('Failed to create lead');
  
  // Invalidate leads list cache (both memory and Redis)
  if (process.env.NODE_ENV === 'development') {
    await memoryCache.invalidate('leads:page:*');
  }
  await invalidate('leads:page:*');
  
  return lead;
}

export async function updateLead(id: UUID, input: LeadUpdateInput): Promise<Lead> {
  const fields = Object.keys(input);
  const values = Object.values(input);
  const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

  const sql = `
    UPDATE leads
    SET ${setClause}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const lead = await queryOne<Lead>(sql, [id, ...values]);
  if (!lead) throw new Error('Lead not found');
  
  // Invalidate leads list cache (both memory and Redis)
  if (process.env.NODE_ENV === 'development') {
    await memoryCache.invalidate('leads:page:*');
  }
  await invalidate('leads:page:*');
  
  return lead;
}

export async function deleteLead(id: UUID): Promise<void> {
  const sql = `DELETE FROM leads WHERE id = $1`;
  await query(sql, [id]);
  
  // Invalidate leads list cache (both memory and Redis)
  if (process.env.NODE_ENV === 'development') {
    await memoryCache.invalidate('leads:page:*');
  }
  await invalidate('leads:page:*');
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export async function getActivities(filters: ActivityFilters = {}): Promise<PaginatedResponse<Activity>> {
  const {
    page = 1,
    limit = 50,
    lead_id,
    assigned_to,
    type,
    status,
    search,
    sort_by = 'activity_date',
    sort_order = 'desc',
  } = filters;

  const offset = (page - 1) * limit;
  const whereClauses: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];
  let paramIndex = 1;

  if (lead_id) {
    whereClauses.push(`lead_id = $${paramIndex}`);
    params.push(lead_id);
    paramIndex++;
  }

  if (assigned_to) {
    whereClauses.push(`assigned_to = $${paramIndex}`);
    params.push(assigned_to);
    paramIndex++;
  }

  if (type) {
    if (Array.isArray(type)) {
      whereClauses.push(`type = ANY($${paramIndex})`);
      params.push(type);
    } else {
      whereClauses.push(`type = $${paramIndex}`);
      params.push(type);
    }
    paramIndex++;
  }

  if (status) {
    if (Array.isArray(status)) {
      whereClauses.push(`status = ANY($${paramIndex})`);
      params.push(status);
    } else {
      whereClauses.push(`status = $${paramIndex}`);
      params.push(status);
    }
    paramIndex++;
  }

  if (search) {
    whereClauses.push(`search_vector @@ plainto_tsquery('english', $${paramIndex})`);
    params.push(search);
    paramIndex++;
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) as total FROM activities ${whereClause}`;
  const countResult = await queryOne<{ total: string }>(countSql, params);
  const total = parseInt(countResult?.total || '0', 10);

  const dataSql = `
    SELECT * FROM activities
    ${whereClause}
    ORDER BY ${sort_by} ${sort_order}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const data = await query<Activity>(dataSql, params);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}

export async function getActivityById(id: UUID): Promise<Activity | null> {
  const sql = `SELECT * FROM activities WHERE id = $1`;
  return queryOne<Activity>(sql, [id]);
}

export async function createActivity(input: ActivityCreateInput): Promise<Activity> {
  const fields = Object.keys(input);
  const values = Object.values(input);
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `
    INSERT INTO activities (${fields.join(', ')}, created_at, updated_at)
    VALUES (${placeholders}, NOW(), NOW())
    RETURNING *
  `;

  const activity = await queryOne<Activity>(sql, values);
  if (!activity) throw new Error('Failed to create activity');
  return activity;
}

export async function updateActivity(id: UUID, input: ActivityUpdateInput): Promise<Activity> {
  const fields = Object.keys(input);
  const values = Object.values(input);
  const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

  const sql = `
    UPDATE activities
    SET ${setClause}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const activity = await queryOne<Activity>(sql, [id, ...values]);
  if (!activity) throw new Error('Activity not found');
  return activity;
}

export async function deleteActivity(id: UUID): Promise<void> {
  const sql = `DELETE FROM activities WHERE id = $1`;
  await query(sql, [id]);
}

// ============================================================================
// NOTES
// ============================================================================

export async function getNotesByLeadId(leadId: UUID): Promise<Note[]> {
  const sql = `
    SELECT n.*, u.name as author_name
    FROM notes n
    LEFT JOIN users u ON n.user_id = u.id
    WHERE n.lead_id = $1
    ORDER BY n.created_at DESC
  `;
  return query<Note>(sql, [leadId]);
}

export async function getNoteById(id: UUID): Promise<Note | null> {
  const sql = `SELECT * FROM notes WHERE id = $1`;
  return queryOne<Note>(sql, [id]);
}

export async function createNote(input: NoteCreateInput): Promise<Note> {
  const fields = Object.keys(input);
  const values = Object.values(input);
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `
    INSERT INTO notes (${fields.join(', ')}, created_at, updated_at)
    VALUES (${placeholders}, NOW(), NOW())
    RETURNING *
  `;

  const note = await queryOne<Note>(sql, values);
  if (!note) throw new Error('Failed to create note');
  return note;
}

export async function updateNote(id: UUID, input: NoteUpdateInput): Promise<Note> {
  const fields = Object.keys(input);
  const values = Object.values(input);
  const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

  const sql = `
    UPDATE notes
    SET ${setClause}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const note = await queryOne<Note>(sql, [id, ...values]);
  if (!note) throw new Error('Note not found');
  return note;
}

export async function deleteNote(id: UUID): Promise<void> {
  const sql = `DELETE FROM notes WHERE id = $1`;
  await query(sql, [id]);
}

// ============================================================================
// USERS
// ============================================================================

export async function getUsers(): Promise<User[]> {
  const sql = `
    SELECT * FROM users
    WHERE active = true
    ORDER BY name
  `;
  return query<User>(sql);
}

export async function getUserById(id: UUID): Promise<User | null> {
  const sql = `SELECT * FROM users WHERE id = $1`;
  return queryOne<User>(sql, [id]);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const sql = `SELECT * FROM users WHERE email = $1`;
  return queryOne<User>(sql, [email]);
}

export async function createUser(input: UserCreateInput): Promise<User> {
  const { password, ...rest } = input;
  const password_hash = await bcrypt.hash(password, 10);

  const fields = [...Object.keys(rest), 'password_hash'];
  const values = [...Object.values(rest), password_hash];
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `
    INSERT INTO users (${fields.join(', ')}, created_at, updated_at)
    VALUES (${placeholders}, NOW(), NOW())
    RETURNING *
  `;

  const user = await queryOne<User>(sql, values);
  if (!user) throw new Error('Failed to create user');
  return user;
}

export async function updateUser(id: UUID, input: UserUpdateInput): Promise<User> {
  const { password, ...rest } = input;
  const fields = Object.keys(rest);
  const values = Object.values(rest);

  // Hash password if provided
  if (password) {
    const password_hash = await bcrypt.hash(password, 10);
    fields.push('password_hash');
    values.push(password_hash);
  }

  const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

  const sql = `
    UPDATE users
    SET ${setClause}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const user = await queryOne<User>(sql, [id, ...values]);
  if (!user) throw new Error('User not found');
  return user;
}

// ============================================================================
// MARKETING SOURCES
// ============================================================================

export async function getMarketingSources(): Promise<MarketingSource[]> {
  const sql = `
    SELECT * FROM marketing_sources
    WHERE active = true
    ORDER BY name
  `;
  return query<MarketingSource>(sql);
}

export async function getMarketingSourceById(id: UUID): Promise<MarketingSource | null> {
  const sql = `SELECT * FROM marketing_sources WHERE id = $1`;
  return queryOne<MarketingSource>(sql, [id]);
}

// ============================================================================
// TASKS
// ============================================================================

export async function getTasks(filters: TaskFilters = {}): Promise<PaginatedResponse<Task>> {
  const {
    page = 1,
    limit = 50,
    assigned_to_id,
    lead_id,
    status,
    priority,
    due_before,
    overdue,
    sort_by = 'due_date',
    sort_order = 'asc',
  } = filters;

  const offset = (page - 1) * limit;
  const whereClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (assigned_to_id) {
    whereClauses.push(`assigned_to_id = $${paramIndex}`);
    params.push(assigned_to_id);
    paramIndex++;
  }

  if (lead_id) {
    whereClauses.push(`lead_id = $${paramIndex}`);
    params.push(lead_id);
    paramIndex++;
  }

  if (status) {
    if (Array.isArray(status)) {
      whereClauses.push(`status = ANY($${paramIndex})`);
      params.push(status);
    } else {
      whereClauses.push(`status = $${paramIndex}`);
      params.push(status);
    }
    paramIndex++;
  }

  if (priority) {
    if (Array.isArray(priority)) {
      whereClauses.push(`priority = ANY($${paramIndex})`);
      params.push(priority);
    } else {
      whereClauses.push(`priority = $${paramIndex}`);
      params.push(priority);
    }
    paramIndex++;
  }

  if (due_before) {
    whereClauses.push(`due_date < $${paramIndex}`);
    params.push(due_before);
    paramIndex++;
  }

  if (overdue) {
    whereClauses.push(`due_date < NOW() AND status IN ('todo', 'in_progress')`);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) as total FROM tasks ${whereClause}`;
  const countResult = await queryOne<{ total: string }>(countSql, params);
  const total = parseInt(countResult?.total || '0', 10);

  const dataSql = `
    SELECT * FROM tasks
    ${whereClause}
    ORDER BY ${sort_by} ${sort_order}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const data = await query<Task>(dataSql, params);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}

export async function getTaskById(id: UUID): Promise<Task | null> {
  const sql = `SELECT * FROM tasks WHERE id = $1`;
  return queryOne<Task>(sql, [id]);
}

export async function createTask(input: TaskCreateInput): Promise<Task> {
  const fields = Object.keys(input);
  const values = Object.values(input);
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `
    INSERT INTO tasks (${fields.join(', ')}, created_at, updated_at)
    VALUES (${placeholders}, NOW(), NOW())
    RETURNING *
  `;

  const task = await queryOne<Task>(sql, values);
  if (!task) throw new Error('Failed to create task');
  return task;
}

export async function updateTask(id: UUID, input: TaskUpdateInput): Promise<Task> {
  const fields = Object.keys(input);
  const values = Object.values(input);
  const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

  const sql = `
    UPDATE tasks
    SET ${setClause}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const task = await queryOne<Task>(sql, [id, ...values]);
  if (!task) throw new Error('Task not found');
  return task;
}

export async function deleteTask(id: UUID): Promise<void> {
  const sql = `DELETE FROM tasks WHERE id = $1`;
  await query(sql, [id]);
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

/**
 * Execute multiple operations in a transaction
 * Auto-rollback on error
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// USER PREFERENCES (COLOR PREFERENCES)
// ============================================================================

export async function getColorPreferences(entityType: string): Promise<Record<string, string>> {
  // Convert codice (LeadStato) → database (lead_status)
  const dbEntityType = ENTITY_TYPE_TO_DB[entityType as keyof typeof ENTITY_TYPE_TO_DB] || entityType;
  
  const sql = `
    SELECT entity_value, color_class
    FROM user_preferences
    WHERE entity_type = $1
  `;
  
  const rows = await query<{ entity_value: string; color_class: string }>(sql, [dbEntityType]);
  
  // Convert to Record<entityValue, colorClass>
  const preferences: Record<string, string> = {};
  rows.forEach(row => {
    preferences[row.entity_value] = row.color_class;
  });
  
  return preferences;
}

export async function saveColorPreference(
  entityType: string,
  entityValue: string,
  colorClass: string
): Promise<void> {
  const dbEntityType = ENTITY_TYPE_TO_DB[entityType as keyof typeof ENTITY_TYPE_TO_DB] || entityType;
  
  const sql = `
    INSERT INTO user_preferences
    VALUES ($1, $2, $3, true, NOW(), NOW(), 'default')
    ON CONFLICT (entity_type, entity_value) 
    WHERE is_default = true
    DO UPDATE SET color_class = $3, updated_at = NOW()
  `;
  
  await query(sql, [dbEntityType, entityValue, colorClass]);
}

export async function deleteColorPreference(
  entityType: string,
  entityValue: string
): Promise<void> {
  const dbEntityType = ENTITY_TYPE_TO_DB[entityType as keyof typeof ENTITY_TYPE_TO_DB] || entityType;
  
  const sql = `
    DELETE FROM user_preferences
    WHERE entity_type = $1 AND entity_value = $2 AND is_default = true
  `;
  
  await query(sql, [dbEntityType, entityValue]);
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Close the connection pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
