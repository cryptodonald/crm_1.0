/**
 * Global Application Types
 * Core type definitions used across the application
 */

// Base entity interface
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: string; // For Airtable cursor-based pagination
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    nextOffset?: string;
  };
}

// Common status enum
export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DRAFT = 'draft',
}

// Priority levels
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Form state
export interface FormState<T = Record<string, unknown>> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isLoading: boolean;
  isDirty: boolean;
  isValid: boolean;
}

// Filter and sort options
export interface FilterOptions {
  [key: string]: unknown;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// UI Component props
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Error boundary
export interface ErrorInfo {
  message: string;
  code?: string | number;
  details?: unknown;
}

// Theme
export interface Theme {
  mode: 'light' | 'dark';
  primary: string;
  accent: string;
}

// User context
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  avatar?: string;
}

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  status: LoadingState;
  error: string | null;
}

// Environment variables type safety
export interface EnvironmentVariables {
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  GITHUB_TOKEN: string;
  GITHUB_WEBHOOK_SECRET: string;
  GOOGLE_PLACES_API_KEY: string;
  VERCEL_BLOB_READ_WRITE_TOKEN: string;
  DATABASE_URL?: string;
  NEXTAUTH_SECRET?: string;
  NEXTAUTH_URL?: string;
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_APP_URL: string;
}
