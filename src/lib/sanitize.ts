import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

/**
 * Input Sanitization Utilities
 * 
 * IMPORTANT: These functions sanitize user input to prevent XSS and injection attacks.
 * Always use these when accepting user input that will be stored or displayed.
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

/**
 * Sanitize plain text input (removes all HTML)
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  // Remove all HTML tags
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return null;
  
  const trimmed = email.trim().toLowerCase();
  
  if (!validator.isEmail(trimmed)) {
    return null;
  }
  
  return validator.normalizeEmail(trimmed) || trimmed;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  const trimmed = url.trim();
  
  if (!validator.isURL(trimmed, {
    protocols: ['http', 'https'],
    require_protocol: true,
  })) {
    return null;
  }
  
  return trimmed;
}

/**
 * Sanitize phone number (Italian format)
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  
  // Remove all non-numeric characters except +
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Validate and sanitize CAP (Italian postal code)
 */
export function sanitizeCap(cap: string | number): string | null {
  if (!cap) return null;
  
  const capStr = String(cap).trim();
  
  // Italian CAP must be exactly 5 digits
  if (!/^\d{5}$/.test(capStr)) {
    return null;
  }
  
  return capStr;
}

/**
 * Sanitize object by applying sanitization to all string fields
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  config: {
    htmlFields?: string[];
    emailFields?: string[];
    urlFields?: string[];
    phoneFields?: string[];
    capFields?: string[];
  } = {}
): T {
  const sanitized: Record<string, any> = { ...obj };
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value !== 'string') continue;
    
    // Apply specific sanitization based on field type
    if (config.htmlFields?.includes(key)) {
      sanitized[key] = sanitizeHtml(value);
    } else if (config.emailFields?.includes(key)) {
      sanitized[key] = sanitizeEmail(value);
    } else if (config.urlFields?.includes(key)) {
      sanitized[key] = sanitizeUrl(value);
    } else if (config.phoneFields?.includes(key)) {
      sanitized[key] = sanitizePhone(value);
    } else if (config.capFields?.includes(key)) {
      sanitized[key] = sanitizeCap(value);
    } else {
      // Default: sanitize as plain text
      sanitized[key] = sanitizeText(value);
    }
  }
  
  return sanitized as T;
}

/**
 * Validate required fields
 */
export function validateRequired(
  obj: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    const value = obj[field];
    if (value === undefined || value === null || value === '') {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Sanitize SQL-like strings to prevent injection
 * (Note: Always use parameterized queries, this is an additional safety layer)
 */
export function sanitizeSqlString(str: string): string {
  if (!str || typeof str !== 'string') return '';
  
  // Escape single quotes and remove dangerous characters
  return str
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
}

/**
 * Helper: Check if string contains potential XSS
 */
export function containsXss(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];
  
  return xssPatterns.some(pattern => pattern.test(str));
}

/**
 * Sanitize lead data before saving to Airtable
 */
export function sanitizeLeadData(data: any) {
  return sanitizeObject(data, {
    htmlFields: ['Note', 'Esigenza'],
    emailFields: ['Email'],
    phoneFields: ['Telefono'],
    capFields: ['CAP'],
  });
}

/**
 * Sanitize activity data before saving to Airtable
 */
export function sanitizeActivityData(data: any) {
  return sanitizeObject(data, {
    htmlFields: ['Note', 'Descrizione'],
  });
}

/**
 * Sanitize order data before saving to Airtable
 */
export function sanitizeOrderData(data: any) {
  return sanitizeObject(data, {
    htmlFields: ['Note'],
    emailFields: ['Email'],
  });
}
