# 🔑 API Keys Usage Guidelines

## 🚨 **CRITICAL RULES**

### ❌ **NEVER DO THIS**

```typescript
// WRONG - Direct environment variable usage
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

// WRONG - Hardcoded values
const USERS_TABLE_ID = 'tbl141xF7ZQskCqGh';
```

### ✅ **ALWAYS DO THIS**

```typescript
// CORRECT - Use API Key Service
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableUsersTableId,
} from '@/lib/api-keys-service';

export async function GET(request: NextRequest) {
  // Get credentials dynamically from KV database
  const [apiKey, baseId, tableId] = await Promise.all([
    getAirtableKey(),
    getAirtableBaseId(),
    getAirtableUsersTableId(),
  ]);

  if (!apiKey || !baseId || !tableId) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
  }

  // Use them in your API calls
  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/${tableId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );
}
```

## 📚 **Available API Key Helpers**

### 🏢 **Airtable**

```typescript
import {
  getAirtableKey, // Main API key
  getAirtableBaseId, // Base ID: app359c17lK0Ta8Ws
  getAirtableLeadsTableId, // tblKIZ9CDjcQorONA
  getAirtableUsersTableId, // tbl141xF7ZQskCqGh
  getAirtableActivitiesTableId, // tblbcuRXKrWvne0Wy
  getAirtableOrdersTableId, // tbl5iiBlaGbj7uHMM
  getAirtableProductsTableId, // tbloI7bXoN4sSvIbw
  getAirtableAutomationsTableId, // tblSd4GAZo9yHQvG0
} from '@/lib/api-keys-service';
```

### 🐙 **GitHub**

```typescript
import {
  getGitHubToken, // Personal access token
  getGitHubKeys, // All GitHub keys at once
} from '@/lib/api-keys-service';

// Get multiple keys at once for performance
const { token, appPrivateKey, webhookSecret } = await getGitHubKeys();
```

### 🗺️ **Google Maps**

```typescript
import { getGoogleMapsKey } from '@/lib/api-keys-service';

const mapsKey = await getGoogleMapsKey();
```

### 🔐 **Authentication & Storage**

```typescript
import {
  getNextAuthSecret, // NextAuth JWT secret
  getBlobToken, // Vercel Blob storage
  getDatabaseUrl, // Database connection
} from '@/lib/api-keys-service';
```

## 📋 **Complete Example: Creating an API Route**

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableLeadsTableId,
} from '@/lib/api-keys-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [Example API] Starting request');

    // 1. Get credentials from KV database (NOT environment variables)
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableLeadsTableId(),
    ]);

    // 2. Validate all credentials are available
    if (!apiKey || !baseId || !tableId) {
      console.error('❌ Missing Airtable credentials:', {
        hasApiKey: !!apiKey,
        hasBaseId: !!baseId,
        hasTableId: !!tableId,
      });
      return NextResponse.json(
        { error: 'Missing Airtable credentials' },
        { status: 500 }
      );
    }

    // 3. Use credentials in your API call
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();

    console.log('✅ [Example API] Success');
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('❌ [Example API] Error:', error);
    return NextResponse.json(
      {
        error: 'API request failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

## 🔄 **Migration Guide**

### If you find old API routes using `process.env`:

1. **Import the API Key Service:**

   ```typescript
   import { getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';
   ```

2. **Replace hardcoded values:**

   ```typescript
   // Before
   const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
   const AIRTABLE_BASE_ID = 'app359c17lK0Ta8Ws';

   // After
   const [apiKey, baseId] = await Promise.all([
     getAirtableKey(),
     getAirtableBaseId(),
   ]);
   ```

3. **Add error handling:**
   ```typescript
   if (!apiKey || !baseId) {
     return NextResponse.json(
       { error: 'Missing credentials' },
       { status: 500 }
     );
   }
   ```

## ⚡ **Performance Tips**

### 1. **Use Promise.all for multiple keys:**

```typescript
// Good - Parallel execution
const [apiKey, baseId, tableId] = await Promise.all([
  getAirtableKey(),
  getAirtableBaseId(),
  getAirtableUsersTableId(),
]);

// Bad - Sequential execution
const apiKey = await getAirtableKey();
const baseId = await getAirtableBaseId(); // Waits for previous
const tableId = await getAirtableUsersTableId(); // Waits for previous
```

### 2. **Use batch helpers when available:**

```typescript
// Use specialized batch helpers
const githubKeys = await getGitHubKeys(); // Gets all GitHub keys at once
```

## 🧪 **Testing with Dynamic Keys**

```typescript
// In tests, you can mock the API key service
import * as apiKeyService from '@/lib/api-keys-service';

jest.mock('@/lib/api-keys-service');

beforeEach(() => {
  (apiKeyService.getAirtableKey as jest.Mock).mockResolvedValue('test-api-key');
  (apiKeyService.getAirtableBaseId as jest.Mock).mockResolvedValue(
    'test-base-id'
  );
});
```

## 🎯 **Why This System?**

1. **🔐 Security**: Keys are encrypted and stored securely in KV database
2. **🔄 Dynamic**: Keys can be updated without code changes or redeployment
3. **📊 Tracking**: Usage statistics and monitoring built-in
4. **🛡️ Permissions**: Granular access control per key
5. **⚡ Performance**: Built-in caching reduces KV database calls
6. **🧪 Testing**: Easy to mock and test different scenarios

---

**Remember: The database KV contains all the real values. Environment variables are only used for KV connection details and user context.**
