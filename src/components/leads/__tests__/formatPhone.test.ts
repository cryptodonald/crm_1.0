import { describe, it, expect } from 'vitest';

// Estraiamo la funzione formatPhone per poterla testare
const formatPhone = (phone: string): string => {
  if (!phone) return phone;
  
  const original = phone.trim();
  
  // Remove all non-digit characters for processing
  const cleaned = phone.replace(/[^\d]/g, '');
  
  // Only remove international prefix if the original had '+39' or '0039' prefix
  // This prevents removing '39' from numbers like '3923511538' which is a valid Italian mobile
  if (original.startsWith('+39') && cleaned.startsWith('39') && cleaned.length > 2) {
    return cleaned.substring(2); // Remove '39' prefix from '+39xxxxxxxxx'
  } else if (original.startsWith('0039') && cleaned.startsWith('0039') && cleaned.length > 4) {
    return cleaned.substring(4); // Remove '0039' prefix from '0039xxxxxxxxx'
  }
  
  // For all other cases (including '39xxxxxxxx' without + prefix), return as-is
  return cleaned;
};

describe('formatPhone', () => {
  it('should remove +39 prefix when phone starts with +39', () => {
    expect(formatPhone('+39 392 1234567')).toBe('3921234567');
    expect(formatPhone('+393921234567')).toBe('3921234567');
    expect(formatPhone('+39 334 9876543')).toBe('3349876543');
  });

  it('should remove 0039 prefix when phone starts with 0039', () => {
    expect(formatPhone('00393921234567')).toBe('3921234567');
    expect(formatPhone('0039 392 123 4567')).toBe('3921234567');
  });

  it('should NOT remove 39 from numbers that start with 39 but without + prefix', () => {
    expect(formatPhone('3923511538')).toBe('3923511538');
    expect(formatPhone('3921234567')).toBe('3921234567');
    expect(formatPhone('39 23 511 538')).toBe('3923511538');
  });

  it('should handle mobile numbers starting with 3', () => {
    expect(formatPhone('3341234567')).toBe('3341234567');
    expect(formatPhone('347 123 4567')).toBe('3471234567');
    expect(formatPhone('320-987-6543')).toBe('3209876543');
  });

  it('should handle landline numbers starting with 0', () => {
    expect(formatPhone('0549963184')).toBe('0549963184');
    expect(formatPhone('06 1234 5678')).toBe('061234567');
    expect(formatPhone('02-87654321')).toBe('0287654321');
  });

  it('should handle already formatted numbers', () => {
    expect(formatPhone('3391234567')).toBe('3391234567');
    expect(formatPhone('3401234567')).toBe('3401234567');
  });

  it('should handle empty and invalid inputs', () => {
    expect(formatPhone('')).toBe('');
    expect(formatPhone(' ')).toBe('');
    expect(formatPhone('abc')).toBe('');
    expect(formatPhone('123')).toBe('123');
  });

  it('should handle the specific bug case mentioned', () => {
    // This was the bug: 3923511538 → 23511538
    // Now it should remain: 3923511538 → 3923511538
    expect(formatPhone('3923511538')).toBe('3923511538');
    
    // But if it had the + prefix, it should be processed
    expect(formatPhone('+393923511538')).toBe('393923511538');
  });

  it('should handle phone numbers with various separators', () => {
    expect(formatPhone('+39 392-351-1538')).toBe('3923511538');
    expect(formatPhone('392 351 1538')).toBe('3923511538');
    expect(formatPhone('392.351.1538')).toBe('3923511538');
    expect(formatPhone('392/351/1538')).toBe('3923511538');
  });
});
