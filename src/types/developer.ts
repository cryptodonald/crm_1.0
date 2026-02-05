/**
 * TypeScript Types for Developer & Task Management Tables
 * 
 * Generated based on Airtable schema
 * Last updated: 2026-02-03
 */

/**
 * Dev Issue (Bug Tracking)
 */
export interface AirtableDevIssue {
  id: string;
  fields: {
    [key: string]: any;
    ID: string; // Formula: RECORD_ID()
    Title: string;
    Description?: string;
    Type: 'bug' | 'feature' | 'improvement' | 'tech_debt';
    Status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
    Priority: 'low' | 'medium' | 'high' | 'critical';
    Tags?: Array<'ui' | 'api' | 'performance' | 'airtable' | 'security' | 'auth' | 'cache' | 'database'>;
    RelatedTo?: string; // Free text link (es: "Lead rec123")
    GitCommit?: string; // Commit SHA or PR link
    Attachments?: Array<{
      id: string;
      url: string;
      filename: string;
      size: number;
      type: string;
    }>;
    CreatedBy?: string[]; // Link to User table
    AssignedTo?: string[]; // Link to User table
    Notifications?: string[]; // Link to Notifications table
    Dev_Issue_Comments?: string[]; // Link to Dev_Issue_Comments table
  };
  createdTime: string;
}

/**
 * User Task (Todo Operativi)
 */
export interface AirtableUserTask {
  id: string;
  fields: {
    [key: string]: any;
    ID: string; // Formula: RECORD_ID()
    Title: string;
    Description?: string;
    Type: 'call' | 'email' | 'whatsapp' | 'followup' | 'meeting' | 'other';
    Status: 'todo' | 'in_progress' | 'done';
    Priority: 'low' | 'medium' | 'high';
    DueDate?: string; // ISO date
    CompletedAt?: string; // ISO date
    AssignedTo?: string[]; // Link to User table
    CreatedBy?: string[]; // Link to User table
    RelatedLead?: string[]; // Link to Lead table
    RelatedActivity?: string[]; // Link to Activity table
    RelatedOrder?: string[]; // Link to Orders table
    Notifications?: string[]; // Link to Notifications table
  };
  createdTime: string;
}

/**
 * Notification
 */
export interface AirtableNotification {
  id: string;
  fields: {
    [key: string]: any;
    ID: string; // Formula: RECORD_ID()
    Title: string;
    Message: string;
    Type: 'issue_assigned' | 'task_assigned' | 'issue_critical' | 'task_due' | 'comment_added' | 'system';
    Read: boolean;
    Recipient?: string[]; // Link to User table
    RelatedIssue?: string[]; // Link to Dev_Issues table
    RelatedTask?: string[]; // Link to User_Tasks table
  };
  createdTime: string;
}

/**
 * Dev Issue Comment
 */
export interface AirtableDevIssueComment {
  id: string;
  fields: {
    [key: string]: any;
    ID: string; // Formula: RECORD_ID()
    Content: string;
    Issue?: string[]; // Link to Dev_Issues table
    Author?: string[]; // Link to User table
  };
  createdTime: string;
}

/**
 * Create Input Types (for API POST requests)
 */
export interface CreateDevIssueInput {
  Title: string;
  Description?: string;
  Type: AirtableDevIssue['fields']['Type'];
  Status?: AirtableDevIssue['fields']['Status'];
  Priority?: AirtableDevIssue['fields']['Priority'];
  Tags?: AirtableDevIssue['fields']['Tags'];
  RelatedTo?: string;
  GitCommit?: string;
  CreatedBy?: string[];
  AssignedTo?: string[];
}

export interface CreateUserTaskInput {
  Title: string;
  Description?: string;
  Type: AirtableUserTask['fields']['Type'];
  Status?: AirtableUserTask['fields']['Status'];
  Priority?: AirtableUserTask['fields']['Priority'];
  DueDate?: string;
  AssignedTo?: string[];
  CreatedBy?: string[];
  RelatedLead?: string[];
  RelatedActivity?: string[];
  RelatedOrder?: string[];
}

export interface CreateNotificationInput {
  Title: string;
  Message: string;
  Type: AirtableNotification['fields']['Type'];
  Recipient: string[];
  RelatedIssue?: string[];
  RelatedTask?: string[];
}

export interface CreateDevIssueCommentInput {
  Content: string;
  Issue: string[];
  Author: string[];
}

/**
 * Update Input Types (for API PATCH requests)
 */
export type UpdateDevIssueInput = Partial<CreateDevIssueInput>;
export type UpdateUserTaskInput = Partial<CreateUserTaskInput>; // CompletedAt removed - is formula field in Airtable
export type UpdateNotificationInput = Partial<Pick<AirtableNotification['fields'], 'Read'>>;

/**
 * Frontend Types (for React components)
 */
export interface DevIssue {
  id: string;
  title: string;
  description?: string;
  type: AirtableDevIssue['fields']['Type'];
  status: AirtableDevIssue['fields']['Status'];
  priority: AirtableDevIssue['fields']['Priority'];
  tags?: AirtableDevIssue['fields']['Tags'];
  relatedTo?: string;
  gitCommit?: string;
  assignedTo?: string[];
  assignedToName?: string;
  createdBy?: string[];
  createdByName?: string;
  createdTime: string;
}

export interface UserTask {
  id: string;
  title: string;
  description?: string;
  type: AirtableUserTask['fields']['Type'];
  status: AirtableUserTask['fields']['Status'];
  priority?: AirtableUserTask['fields']['Priority'];
  dueDate?: string;
  completedAt?: string;
  assignedTo?: string[];
  assignedToName?: string;
  createdBy?: string[];
  createdByName?: string;
  relatedLead?: string[];
  relatedLeadName?: string;
  relatedActivity?: string[];
  relatedOrder?: string[];
  createdTime: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: AirtableNotification['fields']['Type'];
  read: boolean;
  recipient?: string[];
  relatedIssue?: string[];
  relatedTask?: string[];
  createdTime: string;
}
