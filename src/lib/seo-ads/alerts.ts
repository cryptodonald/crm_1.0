/**
 * SEO/Ads Alerts — Automated anomaly detection
 *
 * Detects:
 * 1. Low Quality Score (< 4)
 * 2. High CPC outliers (> 2x average)
 * 3. Wasted spend (cost > €50 with 0 conversions)
 *
 * Run daily via Vercel Cron → sends email digest via Resend.
 */

import { query } from '@/lib/postgres';
import { Resend } from 'resend';

// ============================================================================
// Alert Types
// ============================================================================

export interface Alert {
  type: 'low_quality_score' | 'high_cpc' | 'wasted_spend';
  severity: 'warning' | 'critical';
  keyword: string;
  campaign_name: string;
  detail: string;
}

// ============================================================================
// Detection Queries (last 7 days)
// ============================================================================

/**
 * Detect keywords with Quality Score < 4 (last 7 days, latest value per keyword).
 */
async function detectLowQualityScore(): Promise<Alert[]> {
  const rows = await query<{
    keyword: string;
    campaign_name: string;
    quality_score: number;
    expected_ctr: string | null;
    landing_page_exp: string | null;
    ad_relevance: string | null;
  }>(`
    SELECT DISTINCT ON (sk.keyword, cp.campaign_name)
      sk.keyword,
      cp.campaign_name,
      cp.quality_score,
      cp.expected_ctr,
      cp.landing_page_exp,
      cp.ad_relevance
    FROM seo_campaign_performance cp
    JOIN seo_keywords sk ON cp.keyword_id = sk.id
    WHERE cp.quality_score IS NOT NULL
      AND cp.quality_score < 4
      AND cp.report_date >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY sk.keyword, cp.campaign_name, cp.report_date DESC
  `);

  return rows.map(r => {
    const issues: string[] = [];
    if (r.expected_ctr === 'BELOW_AVERAGE') issues.push('CTR previsto basso');
    if (r.landing_page_exp === 'BELOW_AVERAGE') issues.push('esperienza pagina dest. bassa');
    if (r.ad_relevance === 'BELOW_AVERAGE') issues.push('pertinenza annuncio bassa');

    return {
      type: 'low_quality_score' as const,
      severity: r.quality_score <= 2 ? 'critical' as const : 'warning' as const,
      keyword: r.keyword,
      campaign_name: r.campaign_name,
      detail: `QS ${r.quality_score}/10${issues.length ? ` — ${issues.join(', ')}` : ''}`,
    };
  });
}

/**
 * Detect keywords with CPC > 2x the account average (last 7 days).
 */
async function detectHighCpc(): Promise<Alert[]> {
  const rows = await query<{
    keyword: string;
    campaign_name: string;
    avg_cpc_micros: string;
    account_avg_cpc_micros: string;
  }>(`
    WITH kw_cpc AS (
      SELECT
        cp.keyword_id,
        cp.campaign_name,
        CASE WHEN SUM(cp.clicks) > 0
          THEN SUM(cp.cost_micros) / SUM(cp.clicks)
          ELSE 0
        END as avg_cpc_micros
      FROM seo_campaign_performance cp
      WHERE cp.report_date >= CURRENT_DATE - INTERVAL '7 days'
        AND cp.clicks > 0
      GROUP BY cp.keyword_id, cp.campaign_name
    ),
    account_avg AS (
      SELECT AVG(avg_cpc_micros) FILTER (WHERE avg_cpc_micros > 0) as val
      FROM kw_cpc
    )
    SELECT
      sk.keyword,
      kc.campaign_name,
      kc.avg_cpc_micros::text,
      aa.val::text as account_avg_cpc_micros
    FROM kw_cpc kc
    JOIN seo_keywords sk ON kc.keyword_id = sk.id
    CROSS JOIN account_avg aa
    WHERE kc.avg_cpc_micros > aa.val * 2
      AND kc.avg_cpc_micros > 0
    ORDER BY kc.avg_cpc_micros DESC
    LIMIT 20
  `);

  return rows.map(r => ({
    type: 'high_cpc' as const,
    severity: 'warning' as const,
    keyword: r.keyword,
    campaign_name: r.campaign_name,
    detail: `CPC €${(Number(r.avg_cpc_micros) / 1_000_000).toFixed(2)} (media account: €${(Number(r.account_avg_cpc_micros) / 1_000_000).toFixed(2)})`,
  }));
}

/**
 * Detect wasted spend: cost > €50 with 0 conversions (last 7 days, aggregated).
 */
async function detectWastedSpend(): Promise<Alert[]> {
  const rows = await query<{
    keyword: string;
    campaign_name: string;
    total_cost_micros: string;
    total_clicks: number;
  }>(`
    SELECT
      sk.keyword,
      cp.campaign_name,
      SUM(cp.cost_micros)::text as total_cost_micros,
      SUM(cp.clicks)::integer as total_clicks
    FROM seo_campaign_performance cp
    JOIN seo_keywords sk ON cp.keyword_id = sk.id
    WHERE cp.report_date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY sk.keyword, cp.campaign_name, cp.keyword_id
    HAVING SUM(cp.conversions) = 0
      AND SUM(cp.cost_micros) > 50000000
    ORDER BY SUM(cp.cost_micros) DESC
    LIMIT 20
  `);

  return rows.map(r => ({
    type: 'wasted_spend' as const,
    severity: 'critical' as const,
    keyword: r.keyword,
    campaign_name: r.campaign_name,
    detail: `€${(Number(r.total_cost_micros) / 1_000_000).toFixed(2)} spesi, ${r.total_clicks} click, 0 conversioni (ultimi 7gg)`,
  }));
}

// ============================================================================
// Main: Run all detections
// ============================================================================

export async function runAlertDetection(): Promise<Alert[]> {
  const [lowQs, highCpc, wasted] = await Promise.all([
    detectLowQualityScore(),
    detectHighCpc(),
    detectWastedSpend(),
  ]);
  return [...wasted, ...lowQs, ...highCpc]; // Critical first
}

// ============================================================================
// Email: Send digest via Resend
// ============================================================================

const SEVERITY_EMOJI: Record<string, string> = {
  critical: '🔴',
  warning: '🟡',
};

const TYPE_LABEL: Record<string, string> = {
  low_quality_score: 'Quality Score Basso',
  high_cpc: 'CPC Elevato',
  wasted_spend: 'Spesa Senza Conversioni',
};

export async function sendAlertDigest(alerts: Alert[]): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL;
  if (!apiKey || !notifyEmail || alerts.length === 0) return false;

  const resend = new Resend(apiKey);
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  const subject = `[CRM Ads] ${criticalCount > 0 ? `${criticalCount} alert critici` : `${warningCount} warning`} — ${new Date().toLocaleDateString('it-IT')}`;

  const lines = alerts.map(a =>
    `${SEVERITY_EMOJI[a.severity]} [${TYPE_LABEL[a.type]}] ${a.keyword} (${a.campaign_name})\n   ${a.detail}`
  ).join('\n\n');

  const text = `Report Alert Google Ads — ${new Date().toLocaleDateString('it-IT')}\n\n${criticalCount} critici, ${warningCount} warning\n\n${lines}\n\n---\nCRM Doctorbed — crm.doctorbed.app/dashboard/seo-ads/campaigns`;

  await resend.emails.send({
    from: 'Doctorbed CRM <noreply@crm.doctorbed.app>',
    to: notifyEmail,
    subject,
    text,
  });

  return true;
}
