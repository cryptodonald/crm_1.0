/**
 * CRM Domain Types
 * Business domain specific type definitions
 */

import { BaseEntity, Priority, Status } from './index';

// ============ LEADS ============
export interface Lead extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: LeadStatus;
  source: LeadSource;
  priority: Priority;
  assignedTo?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  
  // Audit fields
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  convertedAt?: string;
  lostReason?: string;
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
}

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  EMAIL_CAMPAIGN = 'email_campaign',
  COLD_OUTREACH = 'cold_outreach',
  TRADE_SHOW = 'trade_show',
  ADVERTISING = 'advertising',
  PARTNER = 'partner',
  OTHER = 'other',
}

// ============ ACTIVITIES ============
export interface Activity extends BaseEntity {
  title: string;
  type: ActivityType;
  status: ActivityStatus;
  priority: Priority;
  description?: string;
  leadId?: string;
  contactId?: string;
  assignedTo?: string;
  
  // Timing
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number; // in minutes
  
  // Outcome
  outcome?: ActivityOutcome;
  notes?: string;
  nextActions?: string[];
  followUpDate?: string;
  
  // Attachments and links
  attachments?: Attachment[];
  relatedRecords?: string[];
}

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  TASK = 'task',
  NOTE = 'note',
  FOLLOW_UP = 'follow_up',
  DEMO = 'demo',
  PROPOSAL = 'proposal',
}

export enum ActivityStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

export enum ActivityOutcome {
  SUCCESSFUL = 'successful',
  PARTIALLY_SUCCESSFUL = 'partially_successful',
  UNSUCCESSFUL = 'unsuccessful',
  NO_RESPONSE = 'no_response',
  RESCHEDULED = 'rescheduled',
}

// ============ CONTACTS ============
export interface Contact extends BaseEntity {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  leadId?: string;
  
  // Social and communication preferences
  linkedInUrl?: string;
  twitterHandle?: string;
  preferredContactMethod?: ContactMethod;
  timeZone?: string;
  
  // Relationship data
  tags?: string[];
  notes?: string;
  lastContactedAt?: string;
  relationship?: ContactRelationship;
}

export enum ContactMethod {
  EMAIL = 'email',
  PHONE = 'phone',
  SMS = 'sms',
  LINKEDIN = 'linkedin',
  WHATSAPP = 'whatsapp',
}

export enum ContactRelationship {
  DECISION_MAKER = 'decision_maker',
  INFLUENCER = 'influencer',
  USER = 'user',
  CHAMPION = 'champion',
  BLOCKER = 'blocker',
}

// ============ COMPANIES ============
export interface Company extends BaseEntity {
  name: string;
  website?: string;
  industry?: string;
  size?: CompanySize;
  revenue?: number;
  location?: Address;
  description?: string;
  
  // Social presence
  linkedInUrl?: string;
  twitterHandle?: string;
  
  // Business data
  annualRevenue?: number;
  employeeCount?: number;
  foundedYear?: number;
  tags?: string[];
}

export enum CompanySize {
  STARTUP = 'startup',
  SMALL = 'small',        // 1-50
  MEDIUM = 'medium',      // 51-200  
  LARGE = 'large',        // 201-1000
  ENTERPRISE = 'enterprise', // 1000+
}

// ============ OPPORTUNITIES ============
export interface Opportunity extends BaseEntity {
  name: string;
  leadId: string;
  companyId?: string;
  stage: OpportunityStage;
  value: number;
  currency: string;
  probability: number; // 0-100
  
  // Timing
  expectedCloseDate: string;
  actualCloseDate?: string;
  
  // Details
  description?: string;
  lostReason?: string;
  nextSteps?: string[];
  competitors?: string[];
  
  // Ownership
  ownerId: string;
  teamMembers?: string[];
}

export enum OpportunityStage {
  IDENTIFICATION = 'identification',
  QUALIFICATION = 'qualification', 
  NEEDS_ANALYSIS = 'needs_analysis',
  VALUE_PROPOSITION = 'value_proposition',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

// ============ SHARED TYPES ============
export interface Attachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
  recordType: 'lead' | 'contact' | 'company' | 'opportunity' | 'activity';
  recordId: string;
}

// ============ PIPELINE & ANALYTICS ============
export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  color: string;
}

export interface CrmMetrics {
  totalLeads: number;
  activeLeads: number;
  conversionRate: number;
  averageDealSize: number;
  salesCycleLength: number; // in days
  
  // Pipeline metrics
  pipelineValue: number;
  weightedPipelineValue: number;
  
  // Activity metrics
  totalActivities: number;
  completedActivities: number;
  overdueActivities: number;
  
  // Time-based metrics
  period: {
    start: string;
    end: string;
  };
}
