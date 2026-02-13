/**
 * SEO Dashboard React Hooks
 *
 * SWR hooks per dashboard KPIs, campaigns, organic, analytics, attribution.
 */

import useSWR from 'swr';
import type {
  SeoDashboardKPIs,
  SeoCampaignPerformance,
  SeoOrganicRanking,
  SeoSiteAnalytics,
  SeoLeadAttribution,
  SeoCompetitorInsight,
} from '@/types/seo-ads';
import type { PaginatedResponse } from '@/types/database';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

/**
 * Hook: Dashboard KPIs (auto-refresh every 5 min)
 */
export function useSeoDashboard(periodStart?: string, periodEnd?: string) {
  const params = new URLSearchParams();
  if (periodStart) params.set('period_start', periodStart);
  if (periodEnd) params.set('period_end', periodEnd);

  const url = `/api/seo-ads/dashboard${params.toString() ? `?${params}` : ''}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ kpis: SeoDashboardKPIs }>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 300_000, // 5 min
      dedupingInterval: 5_000,
    }
  );

  return {
    kpis: data?.kpis || null,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook: Campaign performance
 */
export function useSeoCampaigns(filters?: {
  keyword_id?: string;
  campaign_name?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.keyword_id) params.set('keyword_id', filters.keyword_id);
  if (filters?.campaign_name) params.set('campaign_name', filters.campaign_name);
  if (filters?.date_from) params.set('date_from', filters.date_from);
  if (filters?.date_to) params.set('date_to', filters.date_to);
  if (filters?.page) params.set('page', filters.page.toString());
  if (filters?.limit) params.set('limit', filters.limit.toString());

  const url = `/api/seo-ads/campaigns${params.toString() ? `?${params}` : ''}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    campaigns: SeoCampaignPerformance[];
    total: number;
    pagination: PaginatedResponse<SeoCampaignPerformance>['pagination'];
  }>(url, fetcher, { revalidateOnFocus: false, dedupingInterval: 5000 });

  return {
    campaigns: data?.campaigns || [],
    total: data?.total || 0,
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook: Organic rankings
 */
export function useSeoOrganic(filters?: {
  keyword_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.keyword_id) params.set('keyword_id', filters.keyword_id);
  if (filters?.date_from) params.set('date_from', filters.date_from);
  if (filters?.date_to) params.set('date_to', filters.date_to);
  if (filters?.page) params.set('page', filters.page.toString());
  if (filters?.limit) params.set('limit', filters.limit.toString());

  const url = `/api/seo-ads/organic${params.toString() ? `?${params}` : ''}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    rankings: SeoOrganicRanking[];
    total: number;
    pagination: PaginatedResponse<SeoOrganicRanking>['pagination'];
  }>(url, fetcher, { revalidateOnFocus: false, dedupingInterval: 5000 });

  return {
    rankings: data?.rankings || [],
    total: data?.total || 0,
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook: Site analytics
 */
export function useSeoAnalytics(filters?: {
  source?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.source) params.set('source', filters.source);
  if (filters?.date_from) params.set('date_from', filters.date_from);
  if (filters?.date_to) params.set('date_to', filters.date_to);
  if (filters?.page) params.set('page', filters.page.toString());
  if (filters?.limit) params.set('limit', filters.limit.toString());

  const url = `/api/seo-ads/analytics${params.toString() ? `?${params}` : ''}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    analytics: SeoSiteAnalytics[];
    total: number;
    pagination: PaginatedResponse<SeoSiteAnalytics>['pagination'];
  }>(url, fetcher, { revalidateOnFocus: false, dedupingInterval: 5000 });

  return {
    analytics: data?.analytics || [],
    total: data?.total || 0,
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook: Lead attribution report
 */
export function useSeoAttribution(filters?: {
  source?: string;
  confidence?: string;
  keyword_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.source) params.set('source', filters.source);
  if (filters?.confidence) params.set('confidence', filters.confidence);
  if (filters?.keyword_id) params.set('keyword_id', filters.keyword_id);
  if (filters?.date_from) params.set('date_from', filters.date_from);
  if (filters?.date_to) params.set('date_to', filters.date_to);
  if (filters?.page) params.set('page', filters.page.toString());
  if (filters?.limit) params.set('limit', filters.limit.toString());

  const url = `/api/seo-ads/attribution${params.toString() ? `?${params}` : ''}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    attributions: SeoLeadAttribution[];
    total: number;
    pagination: PaginatedResponse<SeoLeadAttribution>['pagination'];
  }>(url, fetcher, { revalidateOnFocus: false, dedupingInterval: 5000 });

  return {
    attributions: data?.attributions || [],
    total: data?.total || 0,
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook: Competitor insights
 */
export function useSeoCompetitors(filters?: {
  keyword_id?: string;
  competitor_domain?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.keyword_id) params.set('keyword_id', filters.keyword_id);
  if (filters?.competitor_domain) params.set('competitor_domain', filters.competitor_domain);
  if (filters?.date_from) params.set('date_from', filters.date_from);
  if (filters?.date_to) params.set('date_to', filters.date_to);
  if (filters?.page) params.set('page', filters.page.toString());
  if (filters?.limit) params.set('limit', filters.limit.toString());

  const url = `/api/seo-ads/competitors${params.toString() ? `?${params}` : ''}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    competitors: SeoCompetitorInsight[];
    total: number;
    pagination: PaginatedResponse<SeoCompetitorInsight>['pagination'];
  }>(url, fetcher, { revalidateOnFocus: false, dedupingInterval: 5000 });

  return {
    competitors: data?.competitors || [],
    total: data?.total || 0,
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
