# API Keys Management System

This document describes the complete API Keys management system implemented in CRM 1.0.

## Overview

The API Keys system provides secure authentication and authorization for the CRM API, with features including:

- Encrypted API key storage using Vercel KV
- Comprehensive permission management
- Usage tracking and analytics
- IP whitelisting for enhanced security
- Expiration date management
- Real-time statistics and monitoring

## Architecture

### Backend Components

#### 1. Encryption Service (`/src/lib/encryption.ts`)

- **AES-256-GCM encryption** for secure API key storage
- Key derivation using SHA-256
- Utility functions for API key generation and masking

#### 2. KV Storage Service (`/src/lib/kv.ts`)

- **Vercel KV integration** for fast Redis-based storage
- Comprehensive CRUD operations for API keys
- Usage statistics tracking
- Efficient data organization with key prefixes

#### 3. API Routes

- **`/api/api-keys`** - GET (list) and POST (create)
- **`/api/api-keys/[id]`** - GET, PUT (update), DELETE
- **`/api/api-keys/stats`** - Statistics and usage analytics

### Frontend Components

#### 1. Custom Hook (`/src/hooks/use-env-vars.ts`)

- Centralized state management for API keys
- Error handling and loading states
- Automatic data refresh and caching

#### 2. UI Components (`/src/components/api-keys/`)

- **ApiKeysStats** - Dashboard statistics cards
- **ApiKeysDataTable** - Interactive data table with actions
- **ApiKeysEditDialog** - Create/edit form with advanced settings
- **CreateApiKeyButton** - Simple action button

#### 3. Main Page (`/src/app/developers/api-keys/page.tsx`)

- Complete integration of all components
- Real-time updates and error handling
- Responsive layout and user experience

## Features

### Security Features

- **Encryption at Rest**: All API keys are encrypted using AES-256-GCM
- **IP Whitelisting**: Restrict API access to specific IP ranges
- **Permission-based Access**: Granular permission system (read, write, delete, admin)
- **Secure Key Generation**: Cryptographically secure random key generation
- **One-time Key Display**: API keys are shown only once during creation

### Management Features

- **CRUD Operations**: Full create, read, update, delete functionality
- **Bulk Actions**: Multi-select operations for efficiency
- **Search and Filter**: Find API keys quickly
- **Active/Inactive Status**: Enable/disable keys without deletion
- **Expiration Management**: Set automatic expiry dates

### Analytics and Monitoring

- **Usage Statistics**: Track API calls per key
- **Historical Data**: 30-day usage history
- **Trend Analysis**: Week-over-week usage comparison
- **Alert System**: Notifications for expired or expiring keys
- **Real-time Metrics**: Live dashboard statistics

## Environment Variables

The system requires the following environment variables:

```bash
# Encryption
ENCRYPTION_MASTER_KEY=your-256-bit-encryption-key

# Vercel KV
KV_REST_API_URL=your-vercel-kv-rest-api-url
KV_REST_API_TOKEN=your-vercel-kv-rest-api-token

# Development Context
CURRENT_USER_ID=user_dev_001
CURRENT_TENANT_ID=tenant_dev
```

## Usage

### Creating API Keys

1. Navigate to `/developers/api-keys`
2. Click "Create API Key"
3. Configure name, description, permissions
4. Set optional advanced settings (expiration, IP whitelist)
5. Copy the generated key (shown only once)

### Managing API Keys

- **View Details**: Click on any key in the table
- **Edit Settings**: Use the dropdown menu → Edit
- **Delete Keys**: Use the dropdown menu → Delete (with confirmation)
- **Monitor Usage**: View statistics cards and usage metrics

### API Authentication

Include the API key in request headers:

```http
Authorization: Bearer crm_your-api-key-here
```

## Data Model

### ApiKeyData Interface

```typescript
interface ApiKeyData {
  id: string; // Unique identifier
  name: string; // Human-readable name
  key: string; // Encrypted API key
  userId: string; // Owner user ID
  tenantId: string; // Tenant/organization ID
  permissions: string[]; // Permission array ['read', 'write', etc.]
  isActive: boolean; // Active status
  lastUsed?: Date; // Last usage timestamp
  usageCount: number; // Total usage counter
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Last update timestamp
  expiresAt?: Date; // Optional expiration date
  description?: string; // Optional description
  ipWhitelist?: string[]; // Optional IP restrictions
}
```

## Storage Schema

### KV Key Patterns

- `api_key:{id}` - Individual API key data
- `user_api_keys:{userId}` - User's API key list (set)
- `tenant_api_keys:{tenantId}` - Tenant's API key list (set)
- `api_key_usage:{id}:{date}` - Daily usage counters
- `api_key_usage:{id}:last_endpoint` - Last used endpoint

## Security Considerations

1. **Encryption Keys**: Store encryption master keys securely
2. **Environment Isolation**: Use different keys per environment
3. **Access Logging**: Monitor API key usage for anomalies
4. **Regular Rotation**: Encourage periodic key rotation
5. **Principle of Least Privilege**: Grant minimum necessary permissions

## Development Notes

### Testing

The system includes mock data and development contexts. For production:

1. Implement proper authentication middleware
2. Add rate limiting and abuse detection
3. Set up monitoring and alerting
4. Configure proper logging and auditing

### Scaling Considerations

- KV storage handles high-frequency operations efficiently
- Usage statistics are automatically cleaned up (30-day retention)
- Consider implementing key hashing for faster lookups at scale

## Future Enhancements

Potential improvements:

- **API Key Rotation**: Automatic key rotation features
- **Usage Quotas**: Rate limiting per API key
- **Webhook Integration**: Real-time usage notifications
- **Advanced Analytics**: More detailed usage patterns
- **Multi-tenant Management**: Enhanced organization features
- **SSO Integration**: Enterprise authentication options

## Support

For issues or questions about the API Keys system:

1. Check the application logs for error details
2. Verify environment variable configuration
3. Ensure Vercel KV is properly configured
4. Review the API documentation for usage examples
