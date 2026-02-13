/**
 * Google Search Console API Client
 *
 * Wraps googleapis webmasters/searchconsole per organic ranking data.
 * Auth via service account (GOOGLE_SERVICE_ACCOUNT_KEY).
 */

import { google, searchconsole_v1 } from 'googleapis';
import { env } from '@/env';

const SITE_URL = 'https://www.materassidoctorbed.com';

let _client: searchconsole_v1.Searchconsole | null = null;

function getSearchConsoleClient(): searchconsole_v1.Searchconsole {
  if (_client) return _client;

  const serviceAccountKey = env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error(
      'Search Console API not configured. Required: GOOGLE_SERVICE_ACCOUNT_KEY'
    );
  }

  const credentials = JSON.parse(serviceAccountKey);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  _client = google.searchconsole({ version: 'v1', auth });
  return _client;
}

/**
 * Check if Search Console is configured.
 */
export function isSearchConsoleConfigured(): boolean {
  return !!env.GOOGLE_SERVICE_ACCOUNT_KEY;
}

export interface SearchConsoleRow {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  page: string;
}

/**
 * Fetch Search Console performance data for specific queries.
 *
 * @param startDate - ISO date string (YYYY-MM-DD)
 * @param endDate - ISO date string
 * @param keywords - Optional filter to specific keywords
 */
export async function fetchOrganicPerformance(
  startDate: string,
  endDate: string,
  keywords?: string[]
): Promise<SearchConsoleRow[]> {
  const client = getSearchConsoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dimensionFilterGroups: any[] = [];

  if (keywords && keywords.length > 0) {
    // Filter to specific keywords
    dimensionFilterGroups.push({
      filters: keywords.map(kw => ({
        dimension: 'query',
        operator: 'equals',
        expression: kw,
      })),
    });
  }

  const response = await client.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query', 'page'],
      dimensionFilterGroups: dimensionFilterGroups.length > 0
        ? dimensionFilterGroups
        : undefined,
      rowLimit: 1000,
      type: 'web',
    },
  });

  if (!response.data.rows) return [];

  return response.data.rows.map(row => ({
    keyword: row.keys?.[0] ?? '',
    page: row.keys?.[1] ?? '',
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}
