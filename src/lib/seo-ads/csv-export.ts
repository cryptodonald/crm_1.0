/**
 * CSV Export — Client-side CSV generation for SEO campaigns data.
 * Downloads CSV file directly in the browser.
 */

import type { SeoCampaignPerformance } from '@/types/seo-ads';

interface CsvColumn {
  key: string;
  label: string;
  format?: (row: SeoCampaignPerformance) => string;
}

const COLUMNS: CsvColumn[] = [
  { key: 'keyword', label: 'Keyword', format: (r) => r.keyword ?? '' },
  { key: 'campaign_name', label: 'Campagna' },
  { key: 'ad_group_name', label: 'Ad Group' },
  { key: 'match_type', label: 'Tipo Corrispondenza' },
  { key: 'keyword_status', label: 'Stato' },
  { key: 'impressions', label: 'Impressioni' },
  { key: 'clicks', label: 'Click' },
  {
    key: 'ctr',
    label: 'CTR',
    format: (r) => r.impressions > 0 ? ((r.clicks / r.impressions) * 100).toFixed(2) + '%' : '0%',
  },
  {
    key: 'cpc',
    label: 'CPC Medio (€)',
    format: (r) => r.clicks > 0 ? (r.cost_micros / r.clicks / 1_000_000).toFixed(2) : '0.00',
  },
  {
    key: 'cost',
    label: 'Costo (€)',
    format: (r) => (r.cost_micros / 1_000_000).toFixed(2),
  },
  { key: 'conversions', label: 'Conversioni', format: (r) => String(r.conversions ?? 0) },
  {
    key: 'cost_per_conversion',
    label: 'Costo/Conv. (€)',
    format: (r) => r.cost_per_conversion_micros ? (r.cost_per_conversion_micros / 1_000_000).toFixed(2) : '',
  },
  {
    key: 'conversion_rate',
    label: 'Tasso Conv.',
    format: (r) => r.conversion_rate ? (r.conversion_rate * 100).toFixed(2) + '%' : '',
  },
  { key: 'quality_score', label: 'Quality Score', format: (r) => r.quality_score != null ? String(r.quality_score) : '' },
  { key: 'expected_ctr', label: 'CTR Previsto', format: (r) => r.expected_ctr ?? '' },
  { key: 'landing_page_exp', label: 'Esper. Pagina', format: (r) => r.landing_page_exp ?? '' },
  { key: 'ad_relevance', label: 'Pertinenza Ann.', format: (r) => r.ad_relevance ?? '' },
];

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate CSV string from campaign data.
 */
export function generateCampaignsCsv(campaigns: SeoCampaignPerformance[]): string {
  const header = COLUMNS.map((c) => escapeCsv(c.label)).join(',');
  const rows = campaigns.map((row) =>
    COLUMNS.map((col) => {
      const value = col.format
        ? col.format(row)
        : String((row as unknown as Record<string, unknown>)[col.key] ?? '');
      return escapeCsv(value);
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

/**
 * Trigger CSV download in browser.
 */
export function downloadCsv(campaigns: SeoCampaignPerformance[], filename?: string): void {
  const csv = generateCampaignsCsv(campaigns);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `campagne-google-ads-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
