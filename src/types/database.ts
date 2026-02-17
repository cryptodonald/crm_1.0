/**
 * Database Types - Generated from Postgres Schema
 * 
 * Rappresenta lo schema Postgres post-migrazione.
 * Tutte le tabelle con naming convention snake_case inglese.
 */

// ============================================================================
// Core Types
// ============================================================================

export type UUID = string;
export type Timestamptz = Date | string;

// ============================================================================
// LEADS
// ============================================================================

export interface Lead {
  id: UUID;
  created_at: Timestamptz;
  updated_at: Timestamptz;
  
  // Dati anagrafici
  name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  postal_code: number | null;
  gender: string | null;
  
  // Business
  needs: string | null;
  status: LeadStatus | null;
  
  // Relations
  source_id: UUID | null;
  assigned_to: UUID[] | null; // Array di user IDs
  referral_lead_id: UUID | null; // Self-reference per referral chain
  
  // Meta
  attachments: Record<string, unknown> | null; // JSONB - Vercel Blob URLs
  search_vector: string | null; // tsvector (usato internamente)
  
  // Aggregated fields (from JOIN queries)
  activities_count?: number; // Count of related activities (from subquery)
  referral_lead_name?: string | null; // Name of referral lead (from subquery)
  referral_lead_gender?: string | null; // Gender of referral lead (from subquery)
}

export type LeadStatus = 
  | 'Nuovo'
  | 'Contattato'
  | 'Qualificato'
  | 'In Negoziazione'
  | 'Cliente'
  | 'Sospeso'
  | 'Chiuso';

export interface LeadCreateInput {
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  postal_code?: number;
  gender?: string;
  needs?: string;
  status?: LeadStatus;
  source_id?: UUID;
  assigned_to?: UUID[];
  referral_lead_id?: UUID;
}

export type LeadUpdateInput = Partial<LeadCreateInput>;

// ============================================================================
// ACTIVITIES
// ============================================================================

export interface Activity {
  id: UUID;
  created_at: Timestamptz;
  updated_at: Timestamptz;
  
  // Core
  title: string | null;
  type: ActivityType | null;
  activity_date: Timestamptz | null;
  status: ActivityStatus | null;
  
  // Details
  notes: string | null;
  outcome: string | null;
  objective: string | null;
  priority: Priority | null;
  estimated_duration: number | null; // minutes
  
  // Relations
  lead_id: UUID | null;
  assigned_to: UUID | null;
  
  // Meta
  search_vector: string | null;
  
  // Google Calendar sync
  sync_to_google: boolean;
  google_event_id: string | null;
}

export type ActivityType =
  | 'Chiamata'
  | 'Messaggistica'
  | 'Email'
  | 'Consulenza'
  | 'Follow-up'
  | 'Altro';

export type ActivityStatus =
  | 'Da fare'
  | 'In corso'
  | 'Completata'
  | 'Annullata';

export interface ActivityCreateInput {
  title: string;
  type: ActivityType;
  activity_date?: Timestamptz;
  status?: ActivityStatus;
  notes?: string;
  outcome?: string;
  objective?: string;
  priority?: Priority;
  estimated_duration?: number;
  lead_id: UUID;
  assigned_to?: UUID;
  sync_to_google?: boolean;
}

export type ActivityUpdateInput = Partial<ActivityCreateInput>;

// ============================================================================
// NOTES
// ============================================================================

export interface Note {
  id: UUID;
  created_at: Timestamptz;
  updated_at: Timestamptz;
  
  content: string | null;
  pinned: boolean | null;
  
  // Relations
  lead_id: UUID | null;
  user_id: UUID | null;
  
  // Aggregated fields (from JOIN queries)
  author_name?: string | null;
}

export interface NoteCreateInput {
  content: string;
  pinned?: boolean;
  lead_id: UUID;
  user_id?: UUID;
}

export type NoteUpdateInput = Partial<NoteCreateInput>;

// ============================================================================
// USERS
// ============================================================================

export interface User {
  id: UUID;
  created_at: Timestamptz;
  updated_at: Timestamptz;
  
  name: string;
  email: string; // UNIQUE
  role: UserRole;
  active: boolean;
  phone: string | null;
  password_hash: string; // bcrypt
  avatar_url: string | null;
  last_login: Timestamptz | null;
}

export type UserRole = 'admin' | 'user' | 'viewer' | 'sales';

export interface UserCreateInput {
  name: string;
  email: string;
  role: UserRole;
  password: string; // Plain text - verrà hashato
  phone?: string;
  avatar_url?: string;
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
  role?: UserRole;
  active?: boolean;
  phone?: string;
  avatar_url?: string;
  password?: string; // Se fornito, verrà re-hashato
}

// ============================================================================
// MARKETING SOURCES
// ============================================================================

export interface MarketingSource {
  id: UUID;
  created_at: Timestamptz;
  updated_at: Timestamptz;
  
  name: string; // UNIQUE
  description: string | null;
  active: boolean;
}

export interface MarketingSourceCreateInput {
  name: string;
  description?: string;
  active?: boolean;
}

export type MarketingSourceUpdateInput = Partial<MarketingSourceCreateInput>;

// ============================================================================
// TASKS
// ============================================================================

export interface Task {
  id: UUID;
  created_at: Timestamptz;
  updated_at: Timestamptz;
  
  title: string;
  description: string | null;
  type: TaskType | null;
  status: TaskStatus;
  priority: Priority;
  due_date: Timestamptz | null;
  completed_at: Timestamptz | null;
  
  // Relations
  assigned_to_id: UUID | null;
  created_by_id: UUID | null;
  lead_id: UUID | null;
  activity_id: UUID | null;
}

export type TaskType = 'personal' | 'lead' | 'activity' | 'order' | 'general';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

export type Priority = 'high' | 'medium' | 'low';

export interface TaskCreateInput {
  title: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: Priority;
  due_date?: Timestamptz;
  assigned_to_id?: UUID;
  created_by_id?: UUID;
  lead_id?: UUID;
  activity_id?: UUID;
}

export interface TaskUpdateInput extends Partial<TaskCreateInput> {
  completed_at?: Timestamptz;
}

// ============================================================================
// AUTOMATIONS
// ============================================================================

export interface Automation {
  id: UUID;
  created_at: Timestamptz;
  updated_at: Timestamptz;
  
  name: string;
  description: string | null;
  category: string | null;
  priority: string | null;
  is_active: boolean;
  last_executed_at: Timestamptz | null;
  execution_count: number;
  
  created_by_id: UUID | null;
}

export interface AutomationTrigger {
  id: UUID;
  automation_id: UUID;
  trigger_table: string;
  trigger_event: TriggerEvent;
  field_name: string | null;
  operator: TriggerOperator | null;
  value: string | null;
  logic_operator: 'AND' | 'OR';
  position: number;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

export type TriggerEvent = 'create' | 'update' | 'delete' | 'scheduled';

export type TriggerOperator =
  | 'equals'
  | 'not_equals'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'not_contains'
  | 'is_null'
  | 'is_not_null';

export interface AutomationAction {
  id: UUID;
  automation_id: UUID;
  action_type: ActionType;
  target_table: string | null;
  target_field: string | null;
  value: string | null;
  position: number;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

export type ActionType =
  | 'update_field'
  | 'create_activity'
  | 'create_task'
  | 'send_email'
  | 'send_notification'
  | 'webhook';

export interface AutomationLog {
  id: UUID;
  automation_id: UUID;
  executed_at: Timestamptz;
  status: AutomationStatus;
  error_message: string | null;
  affected_records: number;
  execution_time_ms: number | null;
}

export type AutomationStatus = 'success' | 'failed' | 'partial' | 'skipped';

// ============================================================================
// USER PREFERENCES
// ============================================================================

export interface UserPreference {
  id: UUID;
  created_at: Timestamptz;
  updated_at: Timestamptz;
  
  name: string | null;
  entity_type: EntityType;
  entity_value: string;
  color_class: string; // Tailwind CSS classes
  is_default: boolean;
  
  user_id: UUID | null; // NULL = global default
}

export type EntityType =
  | 'lead_status'
  | 'activity_type'
  | 'task_status'
  | 'task_priority'
  | 'source'
  | 'user_role'
  | 'order_status';

export interface UserPreferenceCreateInput {
  entity_type: EntityType;
  entity_value: string;
  color_class: string;
  is_default?: boolean;
  user_id?: UUID;
  name?: string;
}

export type UserPreferenceUpdateInput = Partial<UserPreferenceCreateInput>;

// ============================================================================
// Query Filters & Pagination
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface LeadFilters extends PaginationParams, SortParams {
  status?: LeadStatus | LeadStatus[];
  source_id?: UUID;
  assigned_to?: UUID;
  city?: string;
  search?: string; // FTS search
  dateFrom?: string; // ISO date string for filtering
  dateTo?: string; // ISO date string for filtering
  created_after?: Timestamptz;
  created_before?: Timestamptz;
}

export interface ActivityFilters extends PaginationParams, SortParams {
  lead_id?: UUID;
  assigned_to?: UUID;
  type?: ActivityType | ActivityType[];
  status?: ActivityStatus | ActivityStatus[];
  search?: string; // FTS search
  date_from?: Timestamptz;
  date_to?: Timestamptz;
}

export interface TaskFilters extends PaginationParams, SortParams {
  assigned_to_id?: UUID;
  lead_id?: UUID;
  status?: TaskStatus | TaskStatus[];
  priority?: Priority | Priority[];
  due_before?: Timestamptz;
  overdue?: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
  retryAfter?: number;
}

// ============================================================================
// Database Helper Types
// ============================================================================

export type DbRow = Record<string, unknown>;

export interface QueryResult<T = DbRow> {
  rows: T[];
  rowCount: number;
}

export interface TransactionClient {
  query<T = DbRow>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
}

// ============================================================================
// GOOGLE CALENDAR
// ============================================================================

export type GoogleAccountSyncStatus = 'idle' | 'syncing' | 'error';

export interface GoogleAccount {
  id: UUID;
  user_id: UUID;
  google_email: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: Timestamptz;
  scopes: string[];
  is_corporate: boolean;
  connected_at: Timestamptz;
  last_sync_at: Timestamptz | null;
  sync_status: GoogleAccountSyncStatus;
  sync_error: string | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

export interface GoogleCalendar {
  id: UUID;
  google_account_id: UUID;
  google_calendar_id: string;
  name: string;
  color: string | null;
  is_visible: boolean;
  is_primary: boolean;
  is_writable: boolean;
  sync_token: string | null;
  last_sync_at: Timestamptz | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

export type CalendarEventStatus = 'confirmed' | 'tentative' | 'cancelled';
export type CalendarEventSource = 'google' | 'crm';

export interface CalendarEvent {
  id: UUID;
  google_calendar_id: UUID;
  google_event_id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  start_time: Timestamptz;
  end_time: Timestamptz | null;
  all_day: boolean;
  status: CalendarEventStatus;
  color: string | null;
  recurrence: string[] | null;
  // CRM linking
  activity_id: UUID | null;
  source: CalendarEventSource;
  // Sync metadata
  etag: string | null;
  google_updated_at: Timestamptz | null;
  last_synced_at: Timestamptz | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
  // Aggregated fields (from JOINs)
  calendar_name?: string;
  calendar_color?: string;
  activity_title?: string;
  lead_name?: string;
}

export interface CalendarEventCreateInput {
  google_calendar_id: UUID;
  title: string;
  description?: string;
  location?: string;
  start_time: Timestamptz;
  end_time?: Timestamptz;
  all_day?: boolean;
  activity_id?: UUID;
}

export type CalendarEventUpdateInput = Partial<CalendarEventCreateInput>;

export interface CalendarEventFilters {
  start: Timestamptz;
  end: Timestamptz;
  calendar_ids?: UUID[];
  source?: CalendarEventSource;
}

// ============================================================================
// LEAD ANALYSIS (Anamnesi & Configuratore Materasso)
// ============================================================================

export type BodyShape = 'v_shape' | 'a_shape' | 'normal' | 'h_shape' | 'round';
export type SleepPosition = 'side' | 'supine' | 'prone';
export type FirmnessPreference = 'soft' | 'neutral' | 'firm';
export type HealthIssue =
  | 'lordosis'
  | 'kyphosis'
  | 'lower_back_pain'
  | 'shoulder_pain'
  | 'hip_pain'
  | 'fibromyalgia';

export type MattressModel = 'one' | 'plus' | 'pro';
export type BaseDensity = 'soft' | 'medium' | 'hard';
export type CylinderType = 'none' | 'super_soft_6' | 'soft_8' | 'medium_8' | 'firm_8';
export type LumbarCylinderType = 'soft_8' | 'medium_8' | 'firm_8';
export type PillowCervicalSide = 'gentle' | 'pronounced';

export type BodyType = 'slim' | 'average' | 'athletic' | 'heavy';

export interface LeadAnalysis {
  id: UUID;
  lead_id: UUID;
  person_label: string;
  sex: 'male' | 'female' | null;
  weight_kg: number;
  height_cm: number;
  age_years: number | null;
  body_type: BodyType | null;
  body_shape: BodyShape | null;
  sleep_position: SleepPosition[];
  firmness_preference: FirmnessPreference;
  health_issues: HealthIssue[];
  circulation_issues: boolean;
  snoring_apnea: boolean;
  reads_watches_in_bed: boolean;
  mattress_width_cm: number | null;
  mattress_length_cm: number | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
  created_by: UUID | null;
  // Aggregated from JOINs
  configs?: LeadAnalysisConfig[];
}

export interface LeadAnalysisConfig {
  id: UUID;
  analysis_id: UUID;
  model: MattressModel;
  base_density: BaseDensity;
  topper_level: number; // 1-6
  cylinder_shoulders: CylinderType | null;
  cylinder_lumbar: LumbarCylinderType | null;
  cylinder_legs: CylinderType | null;
  recommend_motorized_base: boolean;
  recommend_pillow: boolean;
  pillow_height_inserts: number | null; // 0-4
  pillow_cervical_side: PillowCervicalSide | null;
  is_manual_override: boolean;
  algorithm_scores: AlgorithmScores;
  created_at: Timestamptz;
}

export interface AlgorithmScores {
  weight_score_topper?: number;
  weight_score_base?: number;
  weight_score_lumbar?: number;
  modifier_total_topper?: number;
  modifier_total_base?: number;
  modifier_total_lumbar?: number;
  final_score_topper?: number;
  final_score_base?: number;
  final_score_lumbar?: number;
  guardrail_applied?: boolean;
}

export interface LeadAnalysisCreateInput {
  lead_id: UUID;
  person_label?: string;
  sex?: 'male' | 'female';
  weight_kg: number;
  height_cm: number;
  age_years?: number;
  body_type?: BodyType;
  body_shape?: BodyShape;
  sleep_position?: SleepPosition[];
  firmness_preference?: FirmnessPreference;
  health_issues?: HealthIssue[];
  circulation_issues?: boolean;
  snoring_apnea?: boolean;
  reads_watches_in_bed?: boolean;
  mattress_width_cm?: number;
  mattress_length_cm?: number;
}

export type LeadAnalysisUpdateInput = Partial<Omit<LeadAnalysisCreateInput, 'lead_id'>>;

export interface AlgorithmSetting {
  id: UUID;
  category: string;
  key: string;
  value: number;
  label: string;
  description: string | null;
  min_value: number | null;
  max_value: number | null;
  updated_at: Timestamptz;
  updated_by: UUID | null;
}

export type AlgorithmSettingCategory =
  | 'weight_anchors_topper'
  | 'weight_anchors_base'
  | 'weight_anchors_lumbar'
  | 'topper_modifiers'
  | 'base_modifiers'
  | 'lumbar_modifiers'
  | 'guardrails'
  | 'shoulder_rules';
