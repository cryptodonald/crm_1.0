/**
 * Types per form leads
 * Basati su AirtableLead ma adattati per form input
 */

import { z } from 'zod';
import type { AirtableLead } from './airtable';

// Estrai i tipi di stato e fonte dai tipi Airtable
export type LeadStato = AirtableLead['fields']['Stato'];

/**
 * Form data per creazione/modifica lead
 * Include campi extra che non sono nel DB Airtable
 */
export interface LeadFormData {
  // Campi base (presenti in Airtable)
  Nome: string;
  Telefono?: string;
  Email?: string;
  Città?: string;
  Esigenza?: string;
  Stato: LeadStato;
  
  // Fonte (select da Marketing Sources)
  Fonte?: string; // Nome fonte (es. "Sito", "Google")
  _fonteId?: string; // ID record Marketing Sources (per API)
  
  // Campi relazione
  AssignedTo?: string[]; // User record IDs
  Referenze?: string[]; // Lead record IDs (referenze da altri lead)
  
  // Campi extra form (non in Airtable, ma usati in CRM 1.0)
  Indirizzo?: string; // Indirizzo completo
  CAP?: number; // Codice postale
  
  // Allegati e avatar
  Avatar?: string; // URL avatar personalizzato
  Gender?: 'male' | 'female' | 'unknown'; // Genere rilevato con AI
  Allegati?: AirtableAttachment[];
}

/**
 * Allegato Airtable
 */
export interface AirtableAttachment {
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
 * Dati default per form nuovo lead
 */
export const DEFAULT_LEAD_DATA: Partial<LeadFormData> = {
  Nome: '',
  Stato: 'Nuovo',
  Fonte: 'Sito', // Default marketing source
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
  Stato: z.enum(['Nuovo', 'Contattato', 'Qualificato', 'In Negoziazione', 'Cliente', 'Perso', 'Sospeso']),
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
