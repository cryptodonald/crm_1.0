// Advanced API Keys Types for Scalable CRM
export type ApiKeyProvider =
  | 'airtable'
  | 'github'
  | 'google'
  | 'vercel'
  | 'stripe'
  | 'sendgrid'
  | 'twilio'
  | 'webhooks'
  | 'custom';

export type ApiKeyScope = 'read' | 'write' | 'admin' | 'sync' | 'webhook';

export type ApiKeyStatus =
  | 'active'
  | 'inactive'
  | 'expired'
  | 'revoked'
  | 'rotating';

export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'rotated'
  | 'accessed'
  | 'failed_auth'
  | 'permissions_changed';

// Core API Key interface
export interface ApiKey {
  id: string;
  name: string;
  description?: string;
  provider: ApiKeyProvider;
  key: string; // encrypted value
  maskedKey: string; // display value
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;

  // Multi-tenant support
  tenantId: string;
  userId: string;
  teamId?: string;

  // Metadata
  environment: 'development' | 'staging' | 'production';
  lastUsed?: Date;
  usageCount: number;

  // Expiration & Rotation
  expiresAt?: Date;
  rotationInterval?: number; // days
  lastRotated?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Extended interface with computed fields
export interface ApiKeyWithMetadata extends ApiKey {
  isExpired: boolean;
  isExpiringSoon: boolean; // within 30 days
  healthStatus: 'healthy' | 'warning' | 'error';
  lastHealthCheck?: Date;
  permissions: ApiKeyPermission[];
  auditTrail: AuditEntry[];
}

// Permissions system
export interface ApiKeyPermission {
  id: string;
  apiKeyId: string;
  resource: string; // e.g., 'leads', 'contacts', 'orders'
  actions: string[]; // e.g., ['read', 'write', 'delete']
  conditions?: Record<string, any>; // e.g., { "owner": "self" }
  createdAt: Date;
  createdBy: string;
}

// Audit trail
export interface AuditEntry {
  id: string;
  apiKeyId: string;
  action: AuditAction;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  userId: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

// Health monitoring
export interface ApiKeyHealth {
  apiKeyId: string;
  provider: ApiKeyProvider;
  isReachable: boolean;
  responseTime?: number;
  lastCheck: Date;
  errorCount: number;
  successRate: number; // percentage
  rateLimit?: {
    limit: number;
    remaining: number;
    resetTime: Date;
  };
}

// Usage metrics
export interface ApiKeyMetrics {
  apiKeyId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;

  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;

  // Data sync metrics
  recordsSynced?: number;
  syncErrors?: number;
  lastSyncAt?: Date;
}

// Provider-specific configurations
export interface ProviderConfig {
  provider: ApiKeyProvider;
  name: string;
  description: string;
  iconUrl?: string;
  baseUrl?: string;
  authType: 'bearer' | 'basic' | 'api_key' | 'oauth';

  // Validation rules
  keyPattern: RegExp;
  keyLength?: { min: number; max: number };
  requiredScopes: ApiKeyScope[];

  // Rate limiting
  defaultRateLimit?: {
    requests: number;
    period: number; // seconds
  };

  // Health check configuration
  healthCheckEndpoint?: string;
  healthCheckInterval?: number; // minutes
}

// Request/Response DTOs
export interface CreateApiKeyRequest {
  name: string;
  description?: string;
  provider: ApiKeyProvider;
  key: string;
  scopes: ApiKeyScope[];
  environment: 'development' | 'staging' | 'production';
  expiresAt?: Date;
  rotationInterval?: number;
  permissions?: Omit<
    ApiKeyPermission,
    'id' | 'apiKeyId' | 'createdAt' | 'createdBy'
  >[];
}

export interface UpdateApiKeyRequest {
  name?: string;
  description?: string;
  scopes?: ApiKeyScope[];
  status?: ApiKeyStatus;
  expiresAt?: Date;
  rotationInterval?: number;
}

export interface ApiKeyListResponse {
  data: ApiKeyWithMetadata[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiKeyStatsResponse {
  total: number;
  active: number;
  expired: number;
  expiringSoon: number;
  byProvider: Record<ApiKeyProvider, number>;
  byStatus: Record<ApiKeyStatus, number>;
  byEnvironment: Record<string, number>;
  healthyKeys: number;
  lastUpdated: Date;
}

// Sync configuration for external providers
export interface SyncConfig {
  apiKeyId: string;
  provider: ApiKeyProvider;
  enabled: boolean;

  // Sync settings
  syncInterval: number; // minutes
  syncDirection: 'inbound' | 'outbound' | 'bidirectional';
  conflictResolution: 'source_wins' | 'target_wins' | 'timestamp' | 'manual';

  // Filters and mappings
  resourceFilters?: Record<string, any>;
  fieldMappings?: Record<string, string>;

  // Last sync info
  lastSyncAt?: Date;
  lastSyncStatus: 'success' | 'error' | 'partial';
  lastSyncError?: string;
  recordsSynced?: number;
}

// Webhook configuration
export interface WebhookConfig {
  id: string;
  apiKeyId: string;
  url: string;
  events: string[];
  secret?: string;
  enabled: boolean;
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
  };
  createdAt: Date;
  lastTriggered?: Date;
}

// Error types
export interface ApiKeyError extends Error {
  code: string;
  apiKeyId?: string;
  provider?: ApiKeyProvider;
  context?: Record<string, any>;
}
