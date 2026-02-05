/**
 * Airtable Schema Types
 * 
 * These types represent the schema of Airtable tables.
 * Keep them in sync with the actual Airtable base schema.
 */

/**
 * User record from Airtable Users table
 * 
 * IMPORTANT: These field names match the ACTUAL Airtable schema.
 * Verified with: scripts/inspect-airtable-users.ts
 * Last updated: 2026-01-30
 */
export interface AirtableUser {
  id: string;
  fields: {
    ID: string;              // Airtable record ID (also available as record.id)
    Nome: string;            // User full name (Italian: "Nome" not "Name")
    Email: string;           // User email address
    Password: string;        // bcrypt password hash (not "PasswordHash")
    Ruolo: 'Admin' | 'Sales' | 'Manager';  // User role (Italian: "Ruolo" not "Role")
    Attivo: boolean;         // Active status (Italian: "Attivo" not "Status")
    Telefono?: string;       // Phone number (optional)
    Avatar_URL?: string;     // Profile image URL (not "ProfileImage")
    GoogleId?: string;       // Google OAuth ID (for Google sign-in)
    Activity?: string[];     // Linked activity record IDs
    Lead?: string[];         // Linked lead record IDs  
    Orders?: string[];       // Linked order record IDs
  };
  createdTime: string;
}

/**
 * Lead record from Airtable Leads table
 * 
 * IMPORTANT: Schema verificato con script inspect-leads.ts
 * Last updated: 2026-01-30
 */
export interface AirtableLead {
  id: string;
  fields: {
    ID: string;              // Airtable record ID
    Nome: string;            // Lead name (Italian: "Nome" not "Name")
    Telefono?: string;       // Phone number (Italian: "Telefono")
    Email?: string;          // Email address (optional, may not exist in schema)
    Città?: string;          // City (Italian: "Città")
    Esigenza?: string;       // Need/Requirement description
    Stato?: 'Nuovo' | 'Contattato' | 'Qualificato' | 'In Negoziazione' | 'Cliente' | 'Perso' | 'Sospeso'; // Status (updated to match Airtable schema)
    Note?: string;           // Notes
    Gender?: 'male' | 'female' | 'unknown'; // Gender rilevato con AI (ottimizzazione)
    Fonte?: string[];        // Source record IDs (array, linked records)
    Data?: string;           // Date (ISO8601)
    Conversations?: string;  // Conversations summary (comma-separated)
    AssignedTo?: string[];   // User record IDs (may not exist yet) - DEPRECATED: use Assegnatario
    Assegnatario?: string[]; // User record IDs (Italian field name in Airtable)
    Activities?: string[];   // Activity record IDs (may not exist yet)
    Orders?: string[];       // Order record IDs (may not exist yet)
    Referenza?: string[];    // Referral lead record IDs (linked records)
    'Nome referenza'?: string | string[]; // Referral lead names (computed/lookup field)
  };
  createdTime: string;
}

/**
 * Activity record from Airtable Activities table
 */
export interface AirtableActivity {
  id: string;
  fields: {
    Type: 'Email' | 'WhatsApp' | 'Call' | 'Consulenza' | 'Prova' | 'Appuntamento';
    Lead: string[]; // Lead record IDs
    User?: string[]; // User record IDs
    Date: string; // ISO8601
    Notes?: string;
    Duration?: number; // minutes
    Outcome?: string;
    CreatedAt?: string;
  };
  createdTime: string;
}

/**
 * Product record from Airtable Products table
 */
export interface AirtableProduct {
  id: string;
  fields: {
    Name: string;
    Description?: string;
    Price: number; // stored as cents (integer)
    Currency?: string;
    SKU?: string;
    Category?: string;
    Status: 'active' | 'inactive';
    Stock?: number;
    ImageUrl?: string;
    CreatedAt?: string;
  };
  createdTime: string;
}

/**
 * Order record from Airtable Orders table
 */
export interface AirtableOrder {
  id: string;
  fields: {
    Lead: string[]; // Lead record IDs (required)
    OrderDate: string; // ISO8601 (required)
    Status: 'Draft' | 'Pending' | 'Confermato' | 'Shipped' | 'Delivered' | 'Cancelled'; // required
    Products?: string[]; // Product record IDs
    TotalAmount?: number; // stored as cents (integer)
    ManualAmountOverride?: boolean;
    ManualAmountReason?: string;
    PaymentMethod?: 'Cash' | 'Card' | 'Transfer' | 'Check';
    DeliveryDate?: string; // ISO8601
    Notes?: string;
    CreatedAt?: string;
    UpdatedAt?: string;
  };
  createdTime: string;
}

/**
 * Automation record from Airtable Automations table (optional)
 */
export interface AirtableAutomation {
  id: string;
  fields: {
    Name: string;
    Type: string;
    Status: 'active' | 'inactive';
    Trigger?: string;
    Actions?: string;
    CreatedAt?: string;
  };
  createdTime: string;
}
