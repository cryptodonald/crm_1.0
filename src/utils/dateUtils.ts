export interface FormatDateOptions {
  includeTime?: boolean;
  format?: string;
  locale?: string;
}

export function formatDate(
  dateString: string, 
  options: FormatDateOptions = {}
): string {
  const { 
    includeTime = false, 
    format = 'dd/MM/yyyy', 
    locale = 'it-IT' 
  } = options;

  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Data non valida';
    }

    // Simple format mapping for common patterns
    if (format === 'dd/MM/yyyy') {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      if (includeTime) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      }
      
      return `${day}/${month}/${year}`;
    }

    if (format === 'dd/MM/yyyy HH:mm') {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    if (format === 'dd MMMM yyyy, HH:mm') {
      return date.toLocaleString(locale, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // Default fallback
    if (includeTime) {
      return date.toLocaleString(locale);
    } else {
      return date.toLocaleDateString(locale);
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Data non valida';
  }
}

export function isDateInRange(
  date: string,
  startDate?: string,
  endDate?: string
): boolean {
  try {
    const targetDate = new Date(date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && targetDate < start) return false;
    if (end && targetDate > end) return false;

    return true;
  } catch {
    return false;
  }
}

export function getDaysDifference(date1: string, date2: string): number {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch {
    return 0;
  }
}

export function isToday(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    const today = new Date();
    
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  } catch {
    return false;
  }
}

export function isOverdue(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    const today = new Date();
    
    // Reset time to compare only dates
    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    return date < today;
  } catch {
    return false;
  }
}

export function getRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Ora';
    if (diffMinutes < 60) return `${diffMinutes} minuti fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays} giorni fa`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} mesi fa`;
    
    return `${Math.floor(diffDays / 365)} anni fa`;
  } catch {
    return 'Data sconosciuta';
  }
}
