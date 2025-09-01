import { NextRequest, NextResponse } from 'next/server';
import { kvApiKeyService } from '@/lib/kv';

// Mock user context for development
// TODO: Replace with actual authentication in production
function getCurrentUser() {
  return {
    id: process.env.CURRENT_USER_ID || 'user_dev_001',
    tenantId: process.env.CURRENT_TENANT_ID || 'tenant_dev',
  };
}

/**
 * GET /api/api-keys/stats - Get API key statistics
 */
export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser();
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const keyId = searchParams.get('keyId');

    if (keyId) {
      // Get usage statistics for a specific API key
      const apiKey = await kvApiKeyService.getApiKey(keyId);

      if (!apiKey) {
        return NextResponse.json(
          { error: 'API key not found' },
          { status: 404 }
        );
      }

      // Verify ownership
      if (apiKey.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const usageStats = await kvApiKeyService.getUsageStats(keyId, days);

      return NextResponse.json({
        apiKeyId: keyId,
        name: apiKey.name,
        usageStats,
        totalUsage: usageStats.reduce((sum, stat) => sum + stat.count, 0),
        dailyAverage: Math.round(
          usageStats.reduce((sum, stat) => sum + stat.count, 0) / days
        ),
      });
    } else {
      // Get overall statistics for the user
      const stats = await kvApiKeyService.getApiKeyStats(user.id);
      const keys = await kvApiKeyService.getUserApiKeys(user.id);

      // Calculate additional stats
      const activeKeys = keys.filter(key => key.isActive);
      const expiredKeys = keys.filter(
        key => key.expiresAt && new Date(key.expiresAt) < new Date()
      );
      const expiringSoonKeys = keys.filter(key => {
        if (!key.expiresAt) return false;
        const expiryDate = new Date(key.expiresAt);
        const now = new Date();
        const daysUntilExpiry =
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      });

      // Get recent activity
      const recentlyUsedKeys = keys
        .filter(key => key.lastUsed)
        .sort(
          (a, b) =>
            new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime()
        )
        .slice(0, 5);

      // Calculate usage trends (last 7 days vs previous 7 days)
      const last7Days = await Promise.all(
        activeKeys.map(async key => {
          const stats = await kvApiKeyService.getUsageStats(key.id, 7);
          return stats.reduce((sum, stat) => sum + stat.count, 0);
        })
      );

      const previous7Days = await Promise.all(
        activeKeys.map(async key => {
          const stats = await kvApiKeyService.getUsageStats(key.id, 14);
          // Take only the first 7 days (older period)
          return stats.slice(0, 7).reduce((sum, stat) => sum + stat.count, 0);
        })
      );

      const currentWeekUsage = last7Days.reduce((sum, usage) => sum + usage, 0);
      const previousWeekUsage = previous7Days.reduce(
        (sum, usage) => sum + usage,
        0
      );
      const usageTrend =
        previousWeekUsage > 0
          ? ((currentWeekUsage - previousWeekUsage) / previousWeekUsage) * 100
          : 0;

      return NextResponse.json({
        overview: {
          ...stats,
          expired: expiredKeys.length,
          expiringSoon: expiringSoonKeys.length,
        },
        trends: {
          currentWeekUsage,
          previousWeekUsage,
          usageTrend: Math.round(usageTrend * 100) / 100, // Round to 2 decimal places
        },
        recentActivity: recentlyUsedKeys.map(key => ({
          id: key.id,
          name: key.name,
          lastUsed: key.lastUsed,
          usageCount: key.usageCount,
        })),
        keysByPermission: {
          read: keys.filter(key => key.permissions.includes('read')).length,
          write: keys.filter(key => key.permissions.includes('write')).length,
          delete: keys.filter(key => key.permissions.includes('delete')).length,
          admin: keys.filter(key => key.permissions.includes('admin')).length,
        },
      });
    }
  } catch (error) {
    console.error('Error fetching API key statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
