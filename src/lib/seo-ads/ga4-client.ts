/**
 * GA4 Data API Client
 *
 * Wraps @google-analytics/data per traffico sito.
 * Auth via service account (GOOGLE_SERVICE_ACCOUNT_KEY).
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { env } from '@/env';

let _client: BetaAnalyticsDataClient | null = null;

function getGA4Config() {
  const propertyId = env.GA4_PROPERTY_ID;
  const serviceAccountKey = env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!propertyId || !serviceAccountKey) {
    throw new Error(
      'GA4 Data API not configured. Required env vars: ' +
      'GA4_PROPERTY_ID, GOOGLE_SERVICE_ACCOUNT_KEY'
    );
  }

  return { propertyId, serviceAccountKey };
}

/**
 * Get GA4 BetaAnalyticsDataClient (singleton).
 */
export function getGA4Client(): BetaAnalyticsDataClient {
  if (_client) return _client;

  const config = getGA4Config();
  const credentials = JSON.parse(config.serviceAccountKey);

  _client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
  });

  return _client;
}

/**
 * Get GA4 property ID (formatted).
 */
export function getGA4PropertyId(): string {
  const config = getGA4Config();
  return `properties/${config.propertyId}`;
}

/**
 * Check if GA4 is configured (without throwing).
 */
export function isGA4Configured(): boolean {
  return !!(env.GA4_PROPERTY_ID && env.GOOGLE_SERVICE_ACCOUNT_KEY);
}

export interface GA4TrafficRow {
  source: string;
  medium: string;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  formSubmissions: number;
}

/**
 * Fetch traffic data per source/medium for a date range.
 */
export async function fetchTrafficBySource(
  startDate: string,
  endDate: string
): Promise<GA4TrafficRow[]> {
  const client = getGA4Client();
  const property = getGA4PropertyId();

  const [response] = await client.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: 'sessionSource' },
      { name: 'sessionMedium' },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
      { name: 'eventCount' }, // form submissions tracked as events
    ],
  });

  if (!response.rows) return [];

  return response.rows.map(row => ({
    source: row.dimensionValues?.[0]?.value ?? '(direct)',
    medium: row.dimensionValues?.[1]?.value ?? '(none)',
    sessions: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
    pageViews: parseInt(row.metricValues?.[1]?.value ?? '0', 10),
    bounceRate: parseFloat(row.metricValues?.[2]?.value ?? '0'),
    avgSessionDuration: parseFloat(row.metricValues?.[3]?.value ?? '0'),
    formSubmissions: parseInt(row.metricValues?.[4]?.value ?? '0', 10),
  }));
}
