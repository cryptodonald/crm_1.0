import { NextRequest, NextResponse } from 'next/server';
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
 * GET /api/api-keys/[id] - Get a specific API key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getCurrentUser();
    const { id } = await params;
    const apiKey = await kvApiKeyService.getApiKey(id);

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Verify ownership
    if (apiKey.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Decrypt and mask the key for display
    let decryptedKey = '';
    try {
      decryptedKey = encryptionService.decrypt(apiKey.key);
    } catch (error) {
      console.error('Failed to decrypt API key:', id, error);
    }

    return NextResponse.json({
      ...apiKey,
      key: encryptionService.maskApiKey(decryptedKey),
      keyPreview: decryptedKey.slice(0, 8) + '...',
      fullValue: decryptedKey, // Include full value for copying
    });
  } catch (error) {
    console.error('Error fetching API key:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API key' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/api-keys/[id] - Update an API key
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getCurrentUser();
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      value,
      description,
      permissions,
      isActive,
      expiresAt,
      ipWhitelist,
    } = body;

    // Get existing API key to verify ownership
    const existingKey = await kvApiKeyService.getApiKey(id);

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Verify ownership
    if (existingKey.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Prepare update data
    const updates: any = {};

    if (name !== undefined) updates.name = name;
    if (value !== undefined && value.trim()) {
      // Update the key value if provided
      updates.key = encryptionService.encrypt(value);
    }
    if (description !== undefined) updates.description = description;
    if (permissions !== undefined) updates.permissions = permissions;
    if (isActive !== undefined) updates.isActive = isActive;
    if (expiresAt !== undefined) {
      updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }
    if (ipWhitelist !== undefined) {
      updates.ipWhitelist = ipWhitelist.length > 0 ? ipWhitelist : undefined;
    }

    // Update the API key
    const updatedKey = await kvApiKeyService.updateApiKey(id, updates);

    if (!updatedKey) {
      return NextResponse.json(
        { error: 'Failed to update API key' },
        { status: 500 }
      );
    }

    // Return updated key with masked value
    let decryptedKey = '';
    try {
      decryptedKey = encryptionService.decrypt(updatedKey.key);
    } catch (error) {
      console.error('Failed to decrypt updated API key:', id, error);
    }

    return NextResponse.json({
      ...updatedKey,
      key: encryptionService.maskApiKey(decryptedKey),
      keyPreview: decryptedKey.slice(0, 8) + '...',
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/api-keys/[id] - Delete an API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getCurrentUser();
    const { id } = await params;

    // Get existing API key to verify ownership
    const existingKey = await kvApiKeyService.getApiKey(id);

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Verify ownership
    if (existingKey.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the API key
    const deleted = await kvApiKeyService.deleteApiKey(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
