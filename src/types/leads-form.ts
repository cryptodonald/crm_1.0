/**
 * Types per form leads
 * Basati su Lead ma adattati per form input
 */

import { z } from 'zod';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Lead, LeadStatus } from './database';

// Types based on Postgres schema
export type LeadStato = LeadStatus;

/**
 * Form data for lead creation/update
 * Maps legacy Italian field names to new Postgres snake_case schema
 */
export interface LeadFormData {
  // Base fields (Postgres schema)
  Nome: string; // → name
  Telefono?: string; // → phone
  Email?: string; // → email
  Città?: string; // → city
  Esigenza?: string; // → notes
  Stato: LeadStato; // → status
  
  // Source (select from Marketing Sources)
  Fonte?: string; // Source name (e.g., "Sito", "Google")
  _fonteId?: string; // source_id (UUID)
  
  // Relationships
  AssignedTo?: string[]; // assigned_to (UUID[])
  Referenze?: string[]; // referral_lead_id (UUID)
  
  // Extra form fields
  Indirizzo?: string; // → address
  CAP?: number; // → postal_code
  
  // Attachments and avatar
  Avatar?: string; // Custom avatar URL
  Gender?: 'male' | 'female' | 'unknown'; // AI-detected gender
  Allegati?: FileAttachment[]; // Not implemented in Postgres v1
}

/**
 * Allegato file
 */
export interface FileAttachment {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
  thumbnails?: {
    small: { url: string; width: number; height: number };
    large: { url: string; width: number; height: number };
  };
}

/**
 * Default data for new lead form
 * Contiene TUTTI i campi per garantire reset completo
 */
export const DEFAULT_LEAD_DATA: Partial<LeadFormData> = {
  Nome: '',
  Telefono: '',
  Email: '',
  Indirizzo: '',
  CAP: undefined,
  Città: '',
  Esigenza: '',
  Stato: 'Nuovo',
  Fonte: 'Sito', // Default marketing source
  _fonteId: undefined,
  AssignedTo: undefined,
  Referenze: undefined,
  Avatar: undefined,
  Gender: 'unknown',
  Allegati: undefined,
};

/**
 * Schema Zod per validazione form lead
 * Basato su LeadFormData per compatibilità con i componenti
 */
export const leadFormSchema = z.object({
  Nome: z.string().min(2, 'Nome troppo breve').max(200, 'Nome troppo lungo'),
  Telefono: z.string().optional(),
  Email: z.string().optional(),
  Indirizzo: z.string().optional(),
  CAP: z.number().optional(),
  Città: z.string().optional(),
  Esigenza: z.string().optional(),
  Stato: z.enum(['Nuovo', 'Contattato', 'Qualificato', 'In Negoziazione', 'Cliente', 'Sospeso', 'Chiuso']),
  Fonte: z.string().optional(),
  _fonteId: z.string().optional(),
  AssignedTo: z.array(z.string()).optional(),
  Referenze: z.array(z.string()).optional(),
  Avatar: z.string().optional(),
  Gender: z.enum(['male', 'female', 'unknown']).optional(),
  Allegati: z.array(z.any()).optional(),
});

// Type inference dal schema Zod
export type LeadFormDataInferred = z.infer<typeof leadFormSchema>;

/**
 * Regole di validazione per i campi
 */
export const LEAD_VALIDATION_RULES = {
  Nome: { required: true, minLength: 2, maxLength: 200 },
  Email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  Telefono: { pattern: /^[+]?[\d\s\-()]{8,}$/ },
  CAP: { min: 10000, max: 99999 },
  Esigenza: { maxLength: 1000 },
} as const;
