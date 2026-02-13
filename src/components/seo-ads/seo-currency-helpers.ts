/**
 * SEO & Ads — Formatting helpers
 *
 * Google Ads API usa micros (1.000.000 = 1€).
 * CRM usa cents (100 = 1€) per deal values.
 */

/**
 * Converte micros Google Ads → stringa €.
 * @example microsToEuros(1_500_000) → "1,50"
 */
export function microsToEuros(micros: number): string {
  return (micros / 1_000_000).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Converte cents CRM → stringa €.
 * @example centsToEuros(15000) → "150,00"
 */
export function centsToEuros(cents: number): string {
  return (cents / 100).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formatta un decimale come percentuale.
 * @example formatPercent(0.0345) → "3,45%"
 * @example formatPercent(0.0345, 1) → "3,5%"
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toLocaleString('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

/**
 * Formatta un numero con separatore migliaia italiano.
 * @example formatNumber(12345) → "12.345"
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('it-IT');
}

/**
 * Formatta posizione media SERP (1 decimale).
 * @example formatPosition(3.7) → "3,7"
 */
export function formatPosition(value: number): string {
  return value.toLocaleString('it-IT', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Calcola variazione percentuale tra due valori.
 * @returns numero tra -1 e +∞ (es. 0.15 = +15%)
 */
export function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 1 : null;
  return (current - previous) / Math.abs(previous);
}
