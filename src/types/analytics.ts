// Types per analytics e performance marketing

export interface MarketingCost {
  id: string;
  Name: string;
  Fonte: LeadSource;
  Budget: number;
  'Data Inizio': string;
  'Data Fine': string;
  Note?: string;
  createdTime: string;
}

export type LeadSource = 
  | 'Meta'
  | 'Instagram'
  | 'Google'
  | 'Sito'
  | 'Referral'
  | 'Organico';

export interface SourcePerformance {
  fonte: LeadSource;
  
  // Lead Metrics
  totalLeads: number;
  qualifiedLeads: number;
  
  // Appointment Metrics
  appointments: number;
  
  // Sales Metrics
  sales: number;
  totalRevenue: number;
  averageOrderValue: number;
  
  // Cost Metrics
  totalCost: number;
  cpl: number; // Cost Per Lead
  cpa: number; // Cost Per Appointment
  cps: number; // Cost Per Sale
  
  // ROI Metrics
  roi: number; // Return on Investment %
  conversionRate: number; // Lead to Sale %
  profitMargin: number; // Margine lordo %
  netProfit: number; // Profitto netto
  
  // Performance Score (0-100)
  performanceScore: number;
  
  // Trend
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface ProductProfitability {
  productId: string;
  productName: string;
  costPrice: number;
  salePrice: number;
  marginPercentage: number;
  unitsSold: number;
  totalProfit: number;
}

export interface PeriodComparison {
  currentPeriod: {
    start: string;
    end: string;
    metrics: SourcePerformance;
  };
  previousPeriod: {
    start: string;
    end: string;
    metrics: SourcePerformance;
  };
  changes: {
    leads: number;
    sales: number;
    revenue: number;
    roi: number;
  };
}

export interface SourceAnalyticsFilters {
  dateStart?: string;
  dateEnd?: string;
  sources?: LeadSource[];
  minBudget?: number;
  sortBy?: 'roi' | 'revenue' | 'cpl' | 'conversionRate' | 'performanceScore';
  sortOrder?: 'asc' | 'desc';
}

export interface AnalyticsSummary {
  totalBudget: number;
  totalLeads: number;
  totalSales: number;
  totalRevenue: number;
  averageCPL: number;
  averageROI: number;
  bestPerformingSource: LeadSource;
  worstPerformingSource: LeadSource;
  recommendations: string[];
}

// Helper function per calcolare performance score
export function calculatePerformanceScore(metrics: {
  roi: number;
  conversionRate: number;
  cpl: number;
  averageCPL: number;
}): number {
  // Algoritmo pesato per score (0-100)
  const roiScore = Math.min((metrics.roi / 200) * 40, 40); // Max 40 punti
  const conversionScore = Math.min((metrics.conversionRate / 50) * 30, 30); // Max 30 punti
  const cplScore = metrics.cpl > 0 
    ? Math.min((1 - (metrics.cpl / (metrics.averageCPL * 2))) * 30, 30) 
    : 0; // Max 30 punti
  
  return Math.round(Math.max(0, roiScore + conversionScore + cplScore));
}

// Helper per determinare trend
export function determineTrend(
  current: number,
  previous: number,
  threshold: number = 5
): { trend: 'up' | 'down' | 'stable'; percentage: number } {
  if (previous === 0) {
    return { trend: 'stable', percentage: 0 };
  }
  
  const percentage = ((current - previous) / previous) * 100;
  
  if (Math.abs(percentage) < threshold) {
    return { trend: 'stable', percentage: 0 };
  }
  
  return {
    trend: percentage > 0 ? 'up' : 'down',
    percentage: Math.abs(percentage)
  };
}
