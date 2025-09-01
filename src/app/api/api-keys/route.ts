import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { kvApiKeyService } from '@/lib/kv';
import { encryptionService } from '@/lib/encryption';

// Mock user context for development
// TODO: Replace with actual authentication in production
function getCurrentUser() {
  return {
    id: process.env.CURRENT_USER_ID || 'user_dev_001',
    tenantId: process.env.CURRENT_TENANT_ID || 'tenant_dev',
  };
}

/**
 * GET /api/api-keys - Retrieve all API keys for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser();
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('stats') === 'true';
    
    // Get user's API keys
    const keys = await kvApiKeyService.getUserApiKeys(user.id);
    
    // Decrypt and mask API keys for display
    const processedKeys = keys.map(key => {
      let decryptedKey = '';
      try {
        decryptedKey = encryptionService.decrypt(key.key);
      } catch (error) {
        console.error('Failed to decrypt API key:', key.id, error);
      }
      
      return {
        ...key,
        key: encryptionService.maskApiKey(decryptedKey), // Show masked version
        keyPreview: decryptedKey.slice(0, 8) + '...', // First 8 chars for preview
      };
    });
    
    const response: any = {
      apiKeys: processedKeys,
      total: processedKeys.length,
    };
    
    // Include statistics if requested
    if (includeStats) {
      const stats = await kvApiKeyService.getApiKeyStats(user.id);
      response.stats = stats;
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/api-keys - Create a new API key
 */
export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser();
    const body = await request.json();
    
    const {
      name,
      value,
      service,
      description,
      permissions = ['read'],
      expiresAt,
      ipWhitelist = [],
    } = body;
    
    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }
    
    if (!value || typeof value !== 'string') {
      return NextResponse.json(
        { error: 'API key value is required and must be a string' },
        { status: 400 }
      );
    }
    
    if (permissions && !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Permissions must be an array' },
        { status: 400 }
      );
    }
    
    // Use the provided API key value
    const rawApiKey = value;
    const encryptedKey = encryptionService.encrypt(rawApiKey);
    
    const apiKeyData = {
      id: nanoid(),
      name,
      key: encryptedKey,
      service: service || undefined,
      userId: user.id,
      tenantId: user.tenantId,
      permissions,
      isActive: true,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      description: description || undefined,
      ipWhitelist: ipWhitelist.length > 0 ? ipWhitelist : undefined,
    };
    
    // Store in KV
    await kvApiKeyService.storeApiKey(apiKeyData);
    
    // Return the new API key (only once, for security)
    return NextResponse.json({
      success: true,
      apiKey: {
        ...apiKeyData,
        key: rawApiKey, // Return the raw key only once
      },
      message: 'API key created successfully. Make sure to copy it now, you won\'t be able to see it again!',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
