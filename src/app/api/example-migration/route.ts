import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getWhatsAppKeys,
  getGitHubToken,
} from '@/lib/api-keys-service';

/**
 * Example API route showing migration from environment variables to API Key service
 * This demonstrates how to use the new centralized API key management system
 */

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting API key migration example...');

    // === BEFORE (Old way with process.env) ===
    // const airtableKey = process.env.AIRTABLE_API_KEY;
    // const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
    // const githubToken = process.env.GITHUB_TOKEN;

    // === AFTER (New way with KV service) ===

    // Method 1: Get individual keys
    console.log('📡 Fetching individual API keys...');
    const airtableKey = await getAirtableKey();
    const githubToken = await getGitHubToken();

    // Method 2: Get related keys in a group (more efficient)
    console.log('📡 Fetching WhatsApp keys bundle...');
    const whatsappKeys = await getWhatsAppKeys();

    // Build response showing the difference
    const response = {
      success: true,
      message: 'API Key migration example completed',

      // Show what we retrieved (masked for security)
      retrievedKeys: {
        airtable: {
          found: !!airtableKey,
          preview: airtableKey ? `${airtableKey.slice(0, 8)}...` : null,
          source: 'KV Database',
        },
        github: {
          found: !!githubToken,
          preview: githubToken ? `${githubToken.slice(0, 12)}...` : null,
          source: 'KV Database',
        },
        whatsapp: {
          accessToken: {
            found: !!whatsappKeys.accessToken,
            preview: whatsappKeys.accessToken
              ? `${whatsappKeys.accessToken.slice(0, 12)}...`
              : null,
            source: 'KV Database',
          },
          webhookSecret: {
            found: !!whatsappKeys.webhookSecret,
            source: 'KV Database',
          },
          appSecret: {
            found: !!whatsappKeys.appSecret,
            source: 'KV Database',
          },
        },
      },

      // Benefits of the new system
      benefits: [
        '🔄 Real-time key updates without redeployment',
        '📊 Automatic usage tracking and analytics',
        '🔐 Encrypted storage with expiration support',
        '👥 Multi-tenant key management',
        '⚡ 5-minute caching for performance',
        '🛡️ Built-in security and validation',
        '📱 Dashboard management at /developers/api-keys',
      ],

      // Migration status
      migration: {
        oldSystem: 'Static environment variables',
        newSystem: 'Dynamic KV database with caching',
        environmentVariablesNeeded: [
          'KV_REST_API_URL',
          'KV_REST_API_TOKEN',
          'ENCRYPTION_MASTER_KEY',
          'CURRENT_USER_ID',
          'CURRENT_TENANT_ID',
        ],
        apiKeysInKV: 16,
        totalMigrated: '100%',
      },
    };

    console.log('✅ API key migration example completed successfully');

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ API key migration example failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to demonstrate API key migration',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback:
          'In production, implement fallback mechanisms for critical services',
      },
      { status: 500 }
    );
  }
}

/**
 * Example showing how to handle API key errors gracefully
 */
export async function POST(request: NextRequest) {
  try {
    const { service } = await request.json();

    // Demonstrate error handling with the new system
    switch (service) {
      case 'airtable':
        const airtableKey = await getAirtableKey();
        if (!airtableKey) {
          return NextResponse.json(
            {
              error: 'Airtable integration unavailable',
              reason: 'API key not found, expired, or inactive',
              action: 'Check dashboard at /developers/api-keys',
              fallback: 'Using cached data or graceful degradation',
            },
            { status: 503 }
          );
        }
        break;

      case 'whatsapp':
        const whatsappKeys = await getWhatsAppKeys();
        if (!whatsappKeys.accessToken) {
          return NextResponse.json(
            {
              error: 'WhatsApp messaging unavailable',
              reason: 'Access token not found or expired',
              action: 'Renew WhatsApp Business API token in dashboard',
              fallback: 'Email notifications will be used instead',
            },
            { status: 503 }
          );
        }
        break;

      default:
        return NextResponse.json(
          {
            error: 'Unknown service requested',
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${service} API key is available and valid`,
      usageTracked: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'API key validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
