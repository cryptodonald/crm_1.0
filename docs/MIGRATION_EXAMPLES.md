# Migration Examples: From process.env to API Key Service

This document shows how to migrate from static environment variables to the dynamic API Key service.

## Before (Old Way with .env)

```typescript
// ❌ Old: Static environment variables
const airtableKey = process.env.AIRTABLE_API_KEY;
const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
const githubToken = process.env.GITHUB_TOKEN;
```

## After (New Way with KV Service)

```typescript
// ✅ New: Dynamic API keys from KV database
import { getAirtableKey, getWhatsAppToken, getGitHubToken } from '@/lib/api-keys-service';

const airtableKey = await getAirtableKey();
const whatsappToken = await getWhatsAppToken();
const githubToken = await getGitHubToken();
```

## Common Migration Patterns

### 1. Single API Key

```typescript
// Before
const key = process.env.AIRTABLE_API_KEY;

// After
import { getAirtableKey } from '@/lib/api-keys-service';
const key = await getAirtableKey();
```

### 2. Multiple API Keys

```typescript
// Before
const airtable = process.env.AIRTABLE_API_KEY;
const whatsapp = process.env.WHATSAPP_ACCESS_TOKEN;
const github = process.env.GITHUB_TOKEN;

// After (Optimized - single KV call)
import { apiKeyService } from '@/lib/api-keys-service';
const keys = await apiKeyService.getApiKeys(['airtable', 'whatsapp-api', 'github-api']);
const airtable = keys['airtable'];
const whatsapp = keys['whatsapp-api'];
const github = keys['github-api'];
```

### 3. Service-Specific Groups

```typescript
// Before
const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
const whatsappSecret = process.env.WHATSAPP_APP_SECRET;
const whatsappWebhook = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

// After (Optimized - single call for related keys)
import { getWhatsAppKeys } from '@/lib/api-keys-service';
const whatsappKeys = await getWhatsAppKeys();
const { accessToken, appSecret, webhookVerifyToken } = whatsappKeys;
```

## API Route Examples

### Before (API Route with env vars)

```typescript
// pages/api/airtable/sync.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const airtableKey = process.env.AIRTABLE_API_KEY;
  
  if (!airtableKey) {
    return res.status(500).json({ error: 'Airtable key not configured' });
  }
  
  // Use the key...
}
```

### After (API Route with KV service)

```typescript
// pages/api/airtable/sync.ts
import { getAirtableKey } from '@/lib/api-keys-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const airtableKey = await getAirtableKey();
  
  if (!airtableKey) {
    return res.status(500).json({ error: 'Airtable key not found or expired' });
  }
  
  // Use the key...
}
```

## Server Component Examples

### Before

```typescript
// app/dashboard/page.tsx
async function DashboardPage() {
  const airtableKey = process.env.AIRTABLE_API_KEY;
  // Fetch data with static key
}
```

### After

```typescript
// app/dashboard/page.tsx
import { getAirtableKey } from '@/lib/api-keys-service';

async function DashboardPage() {
  const airtableKey = await getAirtableKey();
  // Fetch data with dynamic key
  // Usage is automatically tracked!
}
```

## Error Handling

```typescript
import { getAirtableKey } from '@/lib/api-keys-service';

try {
  const airtableKey = await getAirtableKey();
  
  if (!airtableKey) {
    // Key not found, expired, or inactive
    throw new Error('Airtable integration not available');
  }
  
  // Use the key
} catch (error) {
  console.error('Failed to get Airtable key:', error);
  // Handle gracefully
}
```

## Benefits of the New System

1. **Real-time Management**: Keys can be updated without redeployment
2. **Usage Tracking**: Automatic tracking of when and how keys are used
3. **Security**: Encrypted storage and automatic expiration
4. **Multi-tenant**: Different keys per user/tenant
5. **Caching**: 5-minute cache reduces KV calls
6. **Monitoring**: Built-in health checks and error handling

## Migration Checklist

- [ ] Replace `process.env.AIRTABLE_API_KEY` with `getAirtableKey()`
- [ ] Replace `process.env.WHATSAPP_ACCESS_TOKEN` with `getWhatsAppToken()`
- [ ] Replace `process.env.GITHUB_TOKEN` with `getGitHubToken()`
- [ ] Replace `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` with `getGoogleMapsKey()`
- [ ] Replace `process.env.BLOB_READ_WRITE_TOKEN` with `getBlobToken()`
- [ ] Replace `process.env.NEXTAUTH_SECRET` with `getNextAuthSecret()`
- [ ] Update error handling to account for async key retrieval
- [ ] Test all integrations work with dynamic keys
- [ ] Remove old environment variables from deployment

## Performance Tips

1. **Batch requests**: Use `getApiKeys(['service1', 'service2'])` for multiple keys
2. **Cache-friendly**: Keys are cached for 5 minutes to reduce KV calls
3. **Non-blocking usage tracking**: Usage recording doesn't slow down requests
4. **Health checks**: Use `apiKeyService.healthCheck()` for monitoring
