/**
 * Legacy task type - stub per compatibilità
 * TODO: Sostituire con Task da database.ts
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Task } from './database';

// Alias per compatibility - ora usa struttura Postgres diretta
export interface UserTask {
  id: string;
  title: string;
  description?: string | null;
  type?: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  due_date?: string | null;
  assigned_to_id?: string | null;
  created_by_id?: string | null;
  // Legacy fields structure per backward compatibility
  fields: {
    Title: string;
    Description?: string;
    Type: string;
    Status: string;
    Priority: string;
    DueDate?: string;
    AssignedTo?: string[];
    CreatedBy?: string[];
  };
}
