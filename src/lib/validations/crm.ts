/**
 * CRM Domain Validation Schemas
 * Zod schemas for type-safe validation of CRM entities
 */

import { z } from 'zod';

// Base schemas
const baseEntitySchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Shared enums and schemas
export const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

// ============ LEADS ============
export const leadStatusSchema = z.enum([
  'new',
  'contacted', 
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
]);

export const leadSourceSchema = z.enum([
  'website',
  'referral',
  'social_media', 
  'email_campaign',
  'cold_outreach',
  'trade_show',
  'advertising',
  'partner',
  'other',
]);

export const leadSchema = baseEntitySchema.extend({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  status: leadStatusSchema,
  source: leadSourceSchema,
  priority: prioritySchema,
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
  
  // Audit fields
  lastContactedAt: z.string().datetime().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
  convertedAt: z.string().datetime().optional(),
  lostReason: z.string().optional(),
});

// Create lead validation (without audit fields)
export const createLeadSchema = leadSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastContactedAt: true,
  convertedAt: true,
});

// Update lead validation (partial)
export const updateLeadSchema = createLeadSchema.partial();

// ============ ACTIVITIES ============
export const activityTypeSchema = z.enum([
  'call',
  'email',
  'meeting',
  'task',
  'note',
  'follow_up',
  'demo',
  'proposal',
]);

export const activityStatusSchema = z.enum([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'overdue',
]);

export const activityOutcomeSchema = z.enum([
  'successful',
  'partially_successful',
  'unsuccessful',
  'no_response',
  'rescheduled',
]);

export const attachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  url: z.string().url(),
  mimeType: z.string(),
  size: z.number().positive(),
  uploadedAt: z.string().datetime(),
  uploadedBy: z.string(),
});

export const activitySchema = baseEntitySchema.extend({
  title: z.string().min(1, 'Title is required').max(255),
  type: activityTypeSchema,
  status: activityStatusSchema,
  priority: prioritySchema,
  description: z.string().optional(),
  leadId: z.string().optional(),
  contactId: z.string().optional(),
  assignedTo: z.string().optional(),
  
  // Timing
  scheduledAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  duration: z.number().positive().optional(), // minutes
  
  // Outcome
  outcome: activityOutcomeSchema.optional(),
  notes: z.string().optional(),
  nextActions: z.array(z.string()).optional(),
  followUpDate: z.string().datetime().optional(),
  
  // Attachments
  attachments: z.array(attachmentSchema).optional(),
  relatedRecords: z.array(z.string()).optional(),
});

export const createActivitySchema = activitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateActivitySchema = createActivitySchema.partial();

// ============ CONTACTS ============
export const contactMethodSchema = z.enum([
  'email',
  'phone',
  'sms',
  'linkedin',
  'whatsapp',
]);

export const contactRelationshipSchema = z.enum([
  'decision_maker',
  'influencer',
  'user',
  'champion',
  'blocker',
]);

export const contactSchema = baseEntitySchema.extend({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  leadId: z.string().optional(),
  
  // Social and communication
  linkedInUrl: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  twitterHandle: z.string().optional(),
  preferredContactMethod: contactMethodSchema.optional(),
  timeZone: z.string().optional(),
  
  // Relationship data
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  lastContactedAt: z.string().datetime().optional(),
  relationship: contactRelationshipSchema.optional(),
});

export const createContactSchema = contactSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateContactSchema = createContactSchema.partial();

// ============ COMPANIES ============
export const companySizeSchema = z.enum([
  'startup',
  'small',
  'medium', 
  'large',
  'enterprise',
]);

export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

export const companySchema = baseEntitySchema.extend({
  name: z.string().min(1, 'Company name is required').max(255),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  industry: z.string().optional(),
  size: companySizeSchema.optional(),
  revenue: z.number().positive().optional(),
  location: addressSchema.optional(),
  description: z.string().optional(),
  
  // Social presence
  linkedInUrl: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  twitterHandle: z.string().optional(),
  
  // Business data
  annualRevenue: z.number().positive().optional(),
  employeeCount: z.number().int().positive().optional(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  tags: z.array(z.string()).optional(),
});

export const createCompanySchema = companySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCompanySchema = createCompanySchema.partial();

// ============ OPPORTUNITIES ============
export const opportunityStageSchema = z.enum([
  'identification',
  'qualification',
  'needs_analysis',
  'value_proposition',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
]);

export const opportunitySchema = baseEntitySchema.extend({
  name: z.string().min(1, 'Opportunity name is required').max(255),
  leadId: z.string().min(1, 'Lead ID is required'),
  companyId: z.string().optional(),
  stage: opportunityStageSchema,
  value: z.number().positive('Value must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters (e.g., USD)'),
  probability: z.number().int().min(0).max(100, 'Probability must be 0-100'),
  
  // Timing
  expectedCloseDate: z.string().datetime(),
  actualCloseDate: z.string().datetime().optional(),
  
  // Details
  description: z.string().optional(),
  lostReason: z.string().optional(),
  nextSteps: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  
  // Ownership
  ownerId: z.string().min(1, 'Owner ID is required'),
  teamMembers: z.array(z.string()).optional(),
});

export const createOpportunitySchema = opportunitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateOpportunitySchema = createOpportunitySchema.partial();

// ============ PIPELINE ============
export const pipelineStageSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Stage name is required'),
  order: z.number().int().positive(),
  probability: z.number().int().min(0).max(100),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'),
});

export const pipelineSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Pipeline name is required'),
  stages: z.array(pipelineStageSchema).min(1, 'At least one stage is required'),
  isDefault: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createPipelineSchema = pipelineSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============ API REQUEST/RESPONSE ============
export const paginationParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.string().optional(),
});

export const filterParamsSchema = z.object({
  status: z.array(z.string()).optional(),
  source: z.array(z.string()).optional(),
  assignedTo: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
});

export const sortParamsSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']),
});

// Bulk operations
export const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required'),
});

export const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required'),
  updates: z.record(z.unknown()),
});

// ============ TYPE EXPORTS ============
export type LeadInput = z.infer<typeof createLeadSchema>;
export type LeadUpdate = z.infer<typeof updateLeadSchema>;
export type ActivityInput = z.infer<typeof createActivitySchema>;
export type ActivityUpdate = z.infer<typeof updateActivitySchema>;
export type ContactInput = z.infer<typeof createContactSchema>;
export type ContactUpdate = z.infer<typeof updateContactSchema>;
export type CompanyInput = z.infer<typeof createCompanySchema>;
export type CompanyUpdate = z.infer<typeof updateCompanySchema>;
export type OpportunityInput = z.infer<typeof createOpportunitySchema>;
export type OpportunityUpdate = z.infer<typeof updateOpportunitySchema>;
export type PipelineInput = z.infer<typeof createPipelineSchema>;
export type PaginationParams = z.infer<typeof paginationParamsSchema>;
export type FilterParams = z.infer<typeof filterParamsSchema>;
export type SortParams = z.infer<typeof sortParamsSchema>;
