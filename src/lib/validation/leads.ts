/**
 * Leads Validation Schemas (Zod)
 * 
 * Used for:
 * - API request validation
 * - Form validation (react-hook-form integration)
 * - Type safety
 */

import { z } from 'zod';

/**
 * Lead Status enum
 */
export const LeadStatusEnum = z.enum([
  'Nuovo',
  'Contattato',
  'Qualificato',
  'In Negoziazione',
  'Cliente',
  'Sospeso',
  'Chiuso',
]);

/**
 * Create Lead Schema
 * Used for POST /api/leads
 */
export const CreateLeadSchema = z.object({
  Nome: z.string().min(1, 'Nome è obbligatorio').max(200, 'Nome troppo lungo'),
  Telefono: z
    .string()
    .regex(/^[0-9+\s()-]+$/, 'Numero di telefono non valido')
    .optional()
    .or(z.literal('')),
  Email: z.string().email('Email non valida').optional().or(z.literal('')),
  Città: z.string().max(100, 'Città troppo lunga').optional().or(z.literal('')),
  Esigenza: z.string().max(1000, 'Esigenza troppo lunga').optional().or(z.literal('')),
  Stato: LeadStatusEnum.optional().default('Nuovo'),
  Note: z.string().optional().or(z.literal('')),
  Fonte: z.array(z.string()).optional(), // Array of source IDs (UUIDs)
  Data: z.string().datetime().optional(), // ISO8601 datetime
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

/**
 * Update Lead Schema
 * Used for PATCH /api/leads/[id]
 * All fields optional (partial update)
 */
export const UpdateLeadSchema = z
  .object({
    Nome: z.string().min(1, 'Nome non può essere vuoto').max(200, 'Nome troppo lungo').optional(),
    Telefono: z
      .string()
      .regex(/^[0-9+\s()-]+$/, 'Numero di telefono non valido')
      .optional()
      .or(z.literal('')),
    Email: z.string().email('Email non valida').optional().or(z.literal('')),
    Città: z.string().max(100, 'Città troppo lunga').optional().or(z.literal('')),
    Esigenza: z.string().max(1000, 'Esigenza troppo lunga').optional().or(z.literal('')),
    Stato: LeadStatusEnum.optional(),
    Note: z.string().optional().or(z.literal('')),
    Fonte: z.array(z.string()).optional(),
    Data: z.string().datetime().optional(),
  })
  .strict(); // Don't allow extra fields

export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;

/**
 * Lead Filters Schema
 * Used for GET /api/leads query params
 */
export const LeadFiltersSchema = z.object({
  status: z.array(LeadStatusEnum).optional(),
  fonte: z.string().optional(),
  assignedTo: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});

export type LeadFiltersInput = z.infer<typeof LeadFiltersSchema>;

/**
 * Batch Delete Schema
 * Used for POST /api/leads/batch/delete
 */
export const BatchDeleteLeadsSchema = z.object({
  ids: z
    .array(z.string().min(1, 'ID non valido'))
    .min(1, 'Almeno un ID richiesto')
    .max(100, 'Massimo 100 IDs per batch'),
});

export type BatchDeleteLeadsInput = z.infer<typeof BatchDeleteLeadsSchema>;

/**
 * Batch Update Schema
 * Used for POST /api/leads/batch/update
 */
export const BatchUpdateLeadsSchema = z.object({
  ids: z
    .array(z.string().min(1, 'ID non valido'))
    .min(1, 'Almeno un ID richiesto')
    .max(100, 'Massimo 100 IDs per batch'),
  data: UpdateLeadSchema,
});

export type BatchUpdateLeadsInput = z.infer<typeof BatchUpdateLeadsSchema>;

/**
 * Merge Leads Schema
 * Used for POST /api/leads/batch/merge
 */
export const MergeLeadsSchema = z.object({
  primaryId: z.string().min(1, 'Primary ID obbligatorio'),
  duplicateIds: z
    .array(z.string().min(1, 'ID non valido'))
    .min(1, 'Almeno un duplicato richiesto')
    .max(50, 'Massimo 50 duplicati per merge'),
});

export type MergeLeadsInput = z.infer<typeof MergeLeadsSchema>;

/**
 * Helper: Validate data with schema
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: z.ZodIssue[];
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error.issues };
  }
}
