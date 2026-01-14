import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableLeadsTableId,
} from '@/lib/api-keys-service';
import type {
  SourcePerformance,
  LeadSource,
  MarketingCost,
  AnalyticsSummary,
} from '@/types/analytics';
import { calculatePerformanceScore, determineTrend } from '@/types/analytics';

export async function GET(request: NextRequest) {
  const requestStart = performance.now();

  try {
    console.log('📊 [Analytics] Starting source performance analysis...');

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const dateStart = searchParams.get('dateStart');
    const dateEnd = searchParams.get('dateEnd');
    const fonte = searchParams.get('fonte') as LeadSource | null;

    // Get Airtable credentials
    const [apiKey, baseId, leadsTableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableLeadsTableId(),
    ]);

    if (!apiKey || !baseId || !leadsTableId) {
      throw new Error('Missing Airtable credentials');
    }

    // Fetch Leads data
    const leadsResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/${leadsTableId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!leadsResponse.ok) {
      throw new Error(`Airtable API error: ${leadsResponse.status}`);
    }

    const leadsData = await leadsResponse.json();
    const leads = leadsData.records || [];

    // Fetch Marketing Costs (assumo table name "Marketing Costs")
    const costsResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/Marketing%20Costs`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let marketingCosts: MarketingCost[] = [];
    if (costsResponse.ok) {
      const costsData = await costsResponse.json();
      marketingCosts = costsData.records.map((record: any) => ({
        id: record.id,
        ...record.fields,
      }));
    }

    // Fetch Orders per calcolare revenue
    const ordersResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/Orders`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let orders: any[] = [];
    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      orders = ordersData.records || [];
    }

    // Calculate performance per source
    const allSources: LeadSource[] = ['Meta', 'Instagram', 'Google', 'Sito', 'Referral', 'Organico'];
    const targetSources = fonte ? [fonte] : allSources;

    const performanceData: SourcePerformance[] = targetSources.map((fonte) => {
      // Filter leads by source
      const sourceLeads = leads.filter((lead: any) => 
        lead.fields.Provenienza === fonte
      );

      // Filter by date if provided
      const filteredLeads = dateStart && dateEnd
        ? sourceLeads.filter((lead: any) => {
            const leadDate = new Date(lead.fields.Data || lead.createdTime);
            return leadDate >= new Date(dateStart) && leadDate <= new Date(dateEnd);
          })
        : sourceLeads;

      // Calculate metrics
      const totalLeads = filteredLeads.length;
      const qualifiedLeads = filteredLeads.filter(
        (lead: any) => lead.fields.Stato === 'Qualificato' || lead.fields.Stato === 'Cliente'
      ).length;

      // Count sales (Cliente state or has orders)
      const sales = filteredLeads.filter(
        (lead: any) => lead.fields.Stato === 'Cliente' || (lead.fields.Ordini && lead.fields.Ordini.length > 0)
      ).length;

      // Calculate revenue from orders linked to these leads
      const leadIds = filteredLeads.map((lead: any) => lead.id);
      const sourceOrders = orders.filter((order: any) =>
        order.fields.Lead && leadIds.includes(order.fields.Lead[0])
      );

      const totalRevenue = sourceOrders.reduce(
        (sum: number, order: any) => sum + (order.fields['Totale Ordine'] || 0),
        0
      );

      const averageOrderValue = sales > 0 ? totalRevenue / sales : 0;

      // Calculate costs for this source
      const sourceCosts = marketingCosts.filter((cost) => cost.Fonte === fonte);
      const totalCost = sourceCosts.reduce((sum, cost) => sum + (cost.Budget || 0), 0);

      // Calculate cost metrics
      const cpl = totalLeads > 0 ? totalCost / totalLeads : 0;
      const cpa = qualifiedLeads > 0 ? totalCost / qualifiedLeads : 0;
      const cps = sales > 0 ? totalCost / sales : 0;

      // Calculate ROI
      const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

      // Conversion rate
      const conversionRate = totalLeads > 0 ? (sales / totalLeads) * 100 : 0;

      // Profit margin (semplificato, assumo 40% margine medio)
      const estimatedCost = totalRevenue * 0.6; // 60% costo prodotto
      const profitMargin = totalRevenue > 0 ? ((totalRevenue - estimatedCost) / totalRevenue) * 100 : 0;
      const netProfit = totalRevenue - estimatedCost - totalCost;

      // Appointments (stima: lead qualificati)
      const appointments = qualifiedLeads;

      return {
        fonte,
        totalLeads,
        qualifiedLeads,
        appointments,
        sales,
        totalRevenue,
        averageOrderValue,
        totalCost,
        cpl,
        cpa,
        cps,
        roi,
        conversionRate,
        profitMargin,
        netProfit,
        performanceScore: 0, // Calcolato dopo
        trend: 'stable' as const,
        trendPercentage: 0,
      };
    });

    // Calculate average CPL for performance score
    const totalCosts = performanceData.reduce((sum, p) => sum + p.totalCost, 0);
    const totalLeadsCount = performanceData.reduce((sum, p) => sum + p.totalLeads, 0);
    const averageCPL = totalLeadsCount > 0 ? totalCosts / totalLeadsCount : 0;

    // Calculate performance scores
    performanceData.forEach((performance) => {
      performance.performanceScore = calculatePerformanceScore({
        roi: performance.roi,
        conversionRate: performance.conversionRate,
        cpl: performance.cpl,
        averageCPL,
      });
    });

    // Calculate summary
    const summary: AnalyticsSummary = {
      totalBudget: performanceData.reduce((sum, p) => sum + p.totalCost, 0),
      totalLeads: performanceData.reduce((sum, p) => sum + p.totalLeads, 0),
      totalSales: performanceData.reduce((sum, p) => sum + p.sales, 0),
      totalRevenue: performanceData.reduce((sum, p) => sum + p.totalRevenue, 0),
      averageCPL,
      averageROI: performanceData.length > 0
        ? performanceData.reduce((sum, p) => sum + p.roi, 0) / performanceData.length
        : 0,
      bestPerformingSource: performanceData.sort((a, b) => b.performanceScore - a.performanceScore)[0]?.fonte || 'Meta',
      worstPerformingSource: performanceData.sort((a, b) => a.performanceScore - b.performanceScore)[0]?.fonte || 'Meta',
      recommendations: generateRecommendations(performanceData),
    };

    const totalTime = performance.now() - requestStart;
    console.log(`✅ [Analytics] Completed in ${totalTime.toFixed(2)}ms`);

    return NextResponse.json({
      success: true,
      data: performanceData.sort((a, b) => b.performanceScore - a.performanceScore),
      summary,
      _timing: {
        total: Math.round(totalTime),
        cached: false,
      },
    });
  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`❌ [Analytics] Error in ${totalTime.toFixed(2)}ms:`, error);

    return NextResponse.json(
      {
        error: 'Failed to calculate source performance',
        details: errorMessage,
        _timing: { total: Math.round(totalTime), cached: false },
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(performance: SourcePerformance[]): string[] {
  const recommendations: string[] = [];

  // Find best and worst performers
  const sorted = [...performance].sort((a, b) => b.roi - a.roi);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (best && worst && best.fonte !== worst.fonte) {
    if (best.roi > 100 && worst.roi < 50) {
      recommendations.push(
        `Considera di spostare budget da ${worst.fonte} (ROI: ${worst.roi.toFixed(0)}%) a ${best.fonte} (ROI: ${best.roi.toFixed(0)}%)`
      );
    }
  }

  // Check for high CPL
  performance.forEach((p) => {
    if (p.cpl > 50 && p.totalLeads > 10) {
      recommendations.push(
        `${p.fonte}: CPL elevato (€${p.cpl.toFixed(2)}). Ottimizza targeting o creatività.`
      );
    }
  });

  // Check for low conversion
  performance.forEach((p) => {
    if (p.conversionRate < 5 && p.totalLeads > 20) {
      recommendations.push(
        `${p.fonte}: Conversion rate basso (${p.conversionRate.toFixed(1)}%). Migliora processo di vendita o qualità lead.`
      );
    }
  });

  // Check for sources with zero cost but leads (organic/referral)
  performance.forEach((p) => {
    if (p.totalCost === 0 && p.totalLeads > 5 && p.conversionRate > 10) {
      recommendations.push(
        `${p.fonte}: Fonte gratuita con buone performance (${p.conversionRate.toFixed(1)}% conversion). Investi più risorse per scalare.`
      );
    }
  });

  return recommendations.slice(0, 5); // Max 5 recommendations
}
