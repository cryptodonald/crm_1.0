/**
 * Formatta numeri di telefono italiani per la visualizzazione
 * Input DB: +393331122333, +39335112233, +390541645566
 * Output UI: +39 333 1122333, +39 335 112233, +39 0541 665566
 */

export function formatItalianPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Rimuovi spazi esistenti per parsing
  const cleaned = phone.replace(/\s/g, '');
  
  // Se non inizia con +39, ritorna così com'è
  if (!cleaned.startsWith('+39')) {
    return phone;
  }
  
  // Rimuovi il prefisso +39 per processare il numero
  const number = cleaned.substring(3);
  
  // Cellulare (inizia con 3)
  if (number.startsWith('3')) {
    if (number.length === 10) {
      // +39 333 1122333
      return `+39 ${number.substring(0, 3)} ${number.substring(3)}`;
    } else if (number.length === 9) {
      // +39 335 112233
      return `+39 ${number.substring(0, 3)} ${number.substring(3)}`;
    }
  }
  
  // Fisso (inizia con 0)
  if (number.startsWith('0')) {
    // Trova il prefisso (0 + 2-4 cifre)
    // Es: 02 (Milano), 06 (Roma), 0541 (Rimini)
    const prefixMatch = number.match(/^0\d{1,3}/);
    if (prefixMatch) {
      const prefix = prefixMatch[0];
      const rest = number.substring(prefix.length);
      // +39 0541 665566
      return `+39 ${prefix} ${rest}`;
    }
  }
  
  // Fallback: aggiungi solo uno spazio dopo +39
  return `+39 ${number}`;
}

/**
 * Rimuove la formattazione per salvare nel DB
 * Input: +39 333 1122333
 * Output: +393331122333
 */
export function unformatPhone(phone: string): string {
  return phone.replace(/\s/g, '');
}
