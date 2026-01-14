import type { SourcePerformance, AnalyticsSummary } from '@/types/analytics';

/**
 * Export analytics data to CSV
 */
export function exportToCSV(data: SourcePerformance[], summary: AnalyticsSummary | null) {
  // Create CSV header
  const headers = [
    'Fonte',
    'Lead Totali',
    'Lead Qualificati',
    'Appuntamenti',
    'Vendite',
    'Fatturato (€)',
    'Valore Medio Ordine (€)',
    'Budget Speso (€)',
    'CPL (€)',
    'CPA (€)',
    'CPS (€)',
    'ROI (%)',
    'Conversion Rate (%)',
    'Margine Lordo (%)',
    'Profitto Netto (€)',
    'Performance Score',
  ];

  // Create CSV rows
  const rows = data.map((source) => [
    source.fonte,
    source.totalLeads,
    source.qualifiedLeads,
    source.appointments,
    source.sales,
    source.totalRevenue.toFixed(2),
    source.averageOrderValue.toFixed(2),
    source.totalCost.toFixed(2),
    source.cpl.toFixed(2),
    source.cpa.toFixed(2),
    source.cps.toFixed(2),
    source.roi.toFixed(2),
    source.conversionRate.toFixed(2),
    source.profitMargin.toFixed(2),
    source.netProfit.toFixed(2),
    source.performanceScore,
  ]);

  // Add summary row if available
  if (summary) {
    rows.push([]);
    rows.push(['TOTALI / MEDIE']);
    rows.push([
      'Totale',
      summary.totalLeads.toString(),
      '',
      '',
      summary.totalSales.toString(),
      summary.totalRevenue.toFixed(2),
      '',
      summary.totalBudget.toFixed(2),
      summary.averageCPL.toFixed(2),
      '',
      '',
      summary.averageROI.toFixed(2),
      '',
      '',
      '',
      '',
    ]);
  }

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `analytics-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export analytics data to PDF
 * Uses browser's print functionality for simplicity
 */
export function exportToPDF() {
  // Hide elements that shouldn't be in PDF
  const elementsToHide = document.querySelectorAll('[data-print-hidden]');
  elementsToHide.forEach((el) => {
    (el as HTMLElement).style.display = 'none';
  });

  // Trigger print dialog
  window.print();

  // Restore hidden elements
  setTimeout(() => {
    elementsToHide.forEach((el) => {
      (el as HTMLElement).style.display = '';
    });
  }, 100);
}

/**
 * Format data for easy copying to clipboard
 */
export function copyToClipboard(data: SourcePerformance[], summary: AnalyticsSummary | null) {
  const formatCurrency = (value: number) => `€${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  let text = '📊 ANALYTICS REPORT\n';
  text += `Generated: ${new Date().toLocaleString('it-IT')}\n\n`;

  if (summary) {
    text += '=== SUMMARY ===\n';
    text += `Budget Totale: ${formatCurrency(summary.totalBudget)}\n`;
    text += `Lead Totali: ${summary.totalLeads}\n`;
    text += `Vendite Totali: ${summary.totalSales}\n`;
    text += `Fatturato Totale: ${formatCurrency(summary.totalRevenue)}\n`;
    text += `CPL Medio: ${formatCurrency(summary.averageCPL)}\n`;
    text += `ROI Medio: ${formatPercent(summary.averageROI)}\n\n`;
  }

  text += '=== PERFORMANCE PER FONTE ===\n\n';

  data.forEach((source, index) => {
    text += `${index + 1}. ${source.fonte}\n`;
    text += `   Lead: ${source.totalLeads} | CPL: ${formatCurrency(source.cpl)}\n`;
    text += `   Vendite: ${source.sales} | CPS: ${formatCurrency(source.cps)}\n`;
    text += `   Conversion Rate: ${formatPercent(source.conversionRate)}\n`;
    text += `   ROI: ${formatPercent(source.roi)} | Score: ${source.performanceScore}/100\n`;
    text += `   Fatturato: ${formatCurrency(source.totalRevenue)}\n\n`;
  });

  if (summary && summary.recommendations.length > 0) {
    text += '=== RACCOMANDAZIONI ===\n';
    summary.recommendations.forEach((rec, index) => {
      text += `${index + 1}. ${rec}\n`;
    });
  }

  // Copy to clipboard
  navigator.clipboard.writeText(text).then(
    () => {
      console.log('Copied to clipboard');
    },
    (err) => {
      console.error('Failed to copy:', err);
    }
  );

  return text;
}
