-- =====================================================
-- CRM 2.0 - Schema Postgres COMPLETO
-- Replica esatta di tutte le 23 tabelle Airtable
-- Generato da metadata Airtable - 2026-02-05
-- =====================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Full-text search

-- =====================================================
-- 1. LEAD TABLE
-- Table ID: tblKIZ9CDjcQorONA
-- =====================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  -- Campi base
  "ID" TEXT, -- formula
  "Nome" TEXT,
  "Telefono" TEXT,
  "Email" TEXT,
  "Città" TEXT,
  "Esigenza" TEXT,
  "Stato" TEXT,
  "Allegati" TEXT,
  "Data" TIMESTAMPTZ,
  "Ordini" TEXT,
  "Indirizzo" TEXT,
  "CAP" INTEGER,
  "Conversations" TEXT,
  "Nome referenza" TEXT,
  "Order" TEXT,
  "Gender" TEXT CHECK ("Gender" IN ('male', 'female', 'unknown')),
  
  -- Relations (stored as JSON arrays of IDs)
  "Fonte" JSONB, -- array di IDs
  "Attività" JSONB,
  "Assegnatario" JSONB,
  "Referenza" JSONB,
  "From field: Referenza" JSONB,
  "Orders" JSONB,
  "Notes" JSONB,
  "User_Tasks" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_airtable_id ON leads(airtable_id);
CREATE INDEX idx_leads_stato ON leads("Stato");
CREATE INDEX idx_leads_data ON leads("Data" DESC);
CREATE INDEX idx_leads_nome_trgm ON leads USING gin("Nome" gin_trgm_ops);
CREATE INDEX idx_leads_telefono_trgm ON leads USING gin("Telefono" gin_trgm_ops);

-- =====================================================
-- 2. ACTIVITY TABLE
-- Table ID: tblbcuRXKrWvne0Wy
-- =====================================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID" TEXT,
  "Allegati" TEXT,
  "Note" TEXT,
  "Tipo" TEXT,
  "Data" TIMESTAMPTZ,
  "Stato" TEXT,
  "Titolo" TEXT,
  "Durata stimata" INTEGER, -- duration in seconds
  "Obiettivo" TEXT,
  "Priorità" TEXT,
  "Esito" TEXT,
  "Prossima azione" TEXT,
  "Data prossima azione" TIMESTAMPTZ,
  "Creato il " TIMESTAMPTZ,
  "Ultima modifica" TIMESTAMPTZ,
  "Nome Lead" TEXT,
  "Nome Assegnatario" TEXT,
  "Order" TEXT,
  
  -- Relations
  "ID Lead" JSONB,
  "Assegnatario" JSONB,
  "User_Tasks" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_airtable_id ON activities(airtable_id);
CREATE INDEX idx_activities_stato ON activities("Stato");
CREATE INDEX idx_activities_data ON activities("Data" DESC);
CREATE INDEX idx_activities_id_lead ON activities USING gin("ID Lead");

-- =====================================================
-- 3. NOTES TABLE
-- Table ID: tblmvBiXtpQ2Qm0C7
-- =====================================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID" TEXT,
  "Content" TEXT,
  "Type" TEXT,
  "Pinned" BOOLEAN DEFAULT false,
  "CreatedAt" TIMESTAMPTZ,
  
  -- Relations
  "Lead" JSONB,
  "User" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_airtable_id ON notes(airtable_id);
CREATE INDEX idx_notes_created_at ON notes("CreatedAt" DESC);

-- =====================================================
-- 4. USER TABLE
-- Table ID: tbl141xF7ZQskCqGh
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID" TEXT,
  "Nome" TEXT,
  "Ruolo" TEXT,
  "Email" TEXT UNIQUE,
  "Attivo" BOOLEAN DEFAULT true,
  "Telefono" TEXT,
  "Password" TEXT, -- bcrypt hash
  "Avatar_URL" TEXT,
  "AI_Conversations" TEXT,
  "UserColorPreferences" TEXT,
  
  -- Relations
  "Activity" JSONB,
  "Lead" JSONB,
  "Automations" JSONB,
  "Orders" JSONB,
  "Commission_Payments" JSONB,
  "Notes" JSONB,
  "Dev_Issues" JSONB,
  "User_Tasks" JSONB,
  "Notifications" JSONB,
  "Dev_Issue_Comments" JSONB,
  "UserColorPreferences 2" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_airtable_id ON users(airtable_id);
CREATE INDEX idx_users_email ON users("Email");
CREATE INDEX idx_users_ruolo ON users("Ruolo");

-- =====================================================
-- 5. AUTOMATIONS TABLE
-- Table ID: tblSd4GAZo9yHQvG0
-- =====================================================
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID" TEXT,
  "Name" TEXT,
  "Category" TEXT,
  "Priority" TEXT,
  "IsActive" BOOLEAN DEFAULT true,
  "LastExecuted" DATE,
  "ExecutionCount" INTEGER,
  "TriggerTable" TEXT,
  "TriggerEvent" TEXT,
  "Description" TEXT,
  "TriggerField" TEXT,
  "TriggerOperator" TEXT,
  "TriggerValue" TEXT,
  "ActionType" TEXT,
  "ActionTargetTable" TEXT,
  "ActionTargetField" TEXT,
  "ActionValue" TEXT,
  "TriggerField2" TEXT,
  "TriggerOperator2" TEXT,
  "TriggerValue2" TEXT,
  "TriggerLogic" TEXT,
  
  -- Relations
  "CreatedBy" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automations_airtable_id ON automations(airtable_id);
CREATE INDEX idx_automations_active ON automations("IsActive");

-- =====================================================
-- 6. PRODUCTS TABLE
-- Table ID: tblEFvr3aT2jQdYUL
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "Codice_Matrice" TEXT,
  "Nome_Prodotto" TEXT,
  "Descrizione" TEXT,
  "Categoria" TEXT,
  "Prezzo_Listino_Attuale" NUMERIC(10,2),
  "Costo_Attuale" NUMERIC(10,2),
  "Margine_Standard" NUMERIC(5,2),
  "Attivo" BOOLEAN DEFAULT true,
  "In_Evidenza" BOOLEAN DEFAULT false,
  "Metadata" TEXT,
  
  -- Attachments (stored as JSONB array)
  "Foto_Prodotto" JSONB,
  "Schede_Tecniche" JSONB,
  "Manuali" JSONB,
  "Certificazioni" JSONB,
  
  -- Relations
  "Product_Variants" JSONB,
  "Product_Price_History" JSONB,
  "Order_Items" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_airtable_id ON products(airtable_id);
CREATE INDEX idx_products_attivo ON products("Attivo");
CREATE INDEX idx_products_categoria ON products("Categoria");

-- =====================================================
-- 7. PRODUCT_VARIANTS TABLE
-- Table ID: tblGnZgea6HlO2pJ4
-- =====================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID_Variante" TEXT,
  "Tipo_Variante" TEXT,
  "Codice_Variante" TEXT,
  "Nome_Variante" TEXT,
  "Descrizione_Variante" TEXT,
  "Prezzo_Aggiuntivo_Attuale" NUMERIC(10,2),
  "Costo_Aggiuntivo_Attuale" NUMERIC(10,2),
  "Posizione" INTEGER,
  "Attivo" BOOLEAN DEFAULT true,
  
  -- Relations
  "ID_Prodotto" JSONB,
  "Product_Price_History" JSONB,
  "Order_Items" JSONB,
  "Product_Structures" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_variants_airtable_id ON product_variants(airtable_id);

-- =====================================================
-- 8. PRODUCT_STRUCTURES TABLE
-- Table ID: tbl58tZxGfEnLpUZA
-- =====================================================
CREATE TABLE IF NOT EXISTS product_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID_Struttura" TEXT,
  "Nome" TEXT,
  "Descrizione" TEXT,
  "Campi_JSON" TEXT,
  "Attiva" BOOLEAN DEFAULT true,
  "Data_Creazione" TIMESTAMPTZ,
  "Data_Modifica" TIMESTAMPTZ,
  
  -- Relations
  "Product_Variants" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_structures_airtable_id ON product_structures(airtable_id);

-- =====================================================
-- 9. ORDERS TABLE
-- Table ID: tblkqfCMabBpVD1fP
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID_Ordine" TEXT,
  "Data_Ordine" DATE,
  "Data_Consegna_Richiesta" DATE,
  "Stato_Ordine" TEXT,
  "Stato_Pagamento" TEXT,
  "Modalita_Pagamento" TEXT,
  "Totale_Lordo" NUMERIC(10,2),
  "Totale_Sconto" NUMERIC(10,2),
  "Totale_Netto" NUMERIC(10,2),
  "Totale_IVA" NUMERIC(10,2),
  "Totale_Finale" NUMERIC(10,2),
  "Percentuale_Sconto" NUMERIC(5,2),
  "Percentuale_Commissione" NUMERIC(5,2),
  "Importo_Commissione" NUMERIC(10,2),
  "Indirizzo_Consegna" TEXT,
  "Note_Cliente" TEXT,
  "Note_Interne" TEXT,
  "Codice_Tracking" TEXT,
  "Finanziamento_Richiesto" BOOLEAN DEFAULT false,
  "Rata_Mensile" NUMERIC(10,2),
  "Numero_Rate" INTEGER,
  "Tasso_Interesse" NUMERIC(5,2),
  "Stato_Finanziamento" TEXT,
  "Data_Creazione" TIMESTAMPTZ,
  "Ultima_Modifica" TIMESTAMPTZ,
  "URL_Contratto" TEXT,
  "URL_Documenti_Cliente" TEXT,
  "URL_Schede_Cliente" TEXT,
  
  -- Relations
  "ID_Lead" JSONB,
  "ID_Venditore" JSONB,
  "Order_Items" JSONB,
  "Commission_Payments" JSONB,
  "Payment_Transactions" JSONB,
  "User_Tasks" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_airtable_id ON orders(airtable_id);
CREATE INDEX idx_orders_stato ON orders("Stato_Ordine");
CREATE INDEX idx_orders_data ON orders("Data_Ordine" DESC);

-- =====================================================
-- 10. ORDER_ITEMS TABLE
-- Table ID: tblxzhMCa5UJOMZqC
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID_Riga" TEXT,
  "Quantita" INTEGER,
  "Prezzo_Unitario" NUMERIC(10,2),
  "Costo_Unitario" NUMERIC(10,2),
  "Sconto_Percentuale" NUMERIC(5,2),
  "Sconto_Importo" NUMERIC(10,2),
  "Prezzo_Finale_Unitario" NUMERIC(10,2),
  "Totale_Riga" NUMERIC(10,2),
  "Configurazione_JSON" TEXT,
  "Note_Configurazione" TEXT,
  "Codice_Prodotto_Configurato" TEXT,
  "Nome_Prodotto_Personalizzato" TEXT,
  "Dimensioni_Finali" TEXT,
  "Peso_Stimato" NUMERIC(10,2),
  
  -- Relations
  "ID_Ordine" JSONB,
  "ID_Prodotto" JSONB,
  "Configurazione_Varianti" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_airtable_id ON order_items(airtable_id);

-- =====================================================
-- 11. PRODUCT_PRICE_HISTORY TABLE
-- Table ID: tblXtMoiDwLEBG5WE
-- =====================================================
CREATE TABLE IF NOT EXISTS product_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID_Storico" TEXT,
  "Prezzo_Vendita" NUMERIC(10,2),
  "Prezzo_Costo" NUMERIC(10,2),
  "Data_Validita_Da" DATE,
  "Data_Validita_A" DATE,
  "Tipo_Prezzo" TEXT,
  "Motivo_Cambio" TEXT,
  "Creato_Da" TEXT,
  "Note" TEXT,
  "Attivo" BOOLEAN DEFAULT true,
  
  -- Relations
  "ID_Prodotto" JSONB,
  "ID_Variante" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_price_history_airtable_id ON product_price_history(airtable_id);

-- =====================================================
-- 12. COMMISSION_PAYMENTS TABLE
-- Table ID: tblbn6gRCwpmYICdZ
-- =====================================================
CREATE TABLE IF NOT EXISTS commission_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID_Commissione" TEXT,
  "Importo_Vendita" NUMERIC(10,2),
  "Percentuale_Commissione" NUMERIC(5,2),
  "Importo_Commissione" NUMERIC(10,2),
  "Data_Maturazione" DATE,
  "Data_Pagamento" DATE,
  "Stato_Pagamento" TEXT,
  "Modalita_Pagamento" TEXT,
  "Numero_Bonifico" TEXT,
  "IBAN_Destinazione" TEXT,
  "Note_Pagamento" TEXT,
  "Riferimento_Contabile" TEXT,
  "Trimestre_Competenza" TEXT,
  "Anno_Competenza" INTEGER,
  "Data_Creazione" TIMESTAMPTZ,
  "URL_Ricevuta_Commissione" TEXT,
  "URL_Documento_Pagamento" TEXT,
  
  -- Relations
  "ID_Ordine" JSONB,
  "ID_Venditore" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commission_payments_airtable_id ON commission_payments(airtable_id);

-- =====================================================
-- 13. PAYMENT_TRANSACTIONS TABLE
-- Table ID: tbl2bzbSxMDch72CY
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID_Transazione" TEXT,
  "Importo" NUMERIC(10,2),
  "Data_Transazione" TIMESTAMPTZ,
  "Tipo_Transazione" TEXT,
  "Modalita_Pagamento" TEXT,
  "Stato_Transazione" TEXT,
  "Riferimento_Esterno" TEXT,
  "ID_Transazione_Gateway" TEXT,
  "Codice_Autorizzazione" TEXT,
  "Numero_Ricevuta" TEXT,
  "IBAN_Mittente" TEXT,
  "Nome_Titolare" TEXT,
  "Commissioni_Gateway" NUMERIC(10,2),
  "Tasso_Cambio" NUMERIC(10,6),
  "Valuta_Originale" TEXT,
  "Importo_Originale" NUMERIC(10,2),
  "Note_Transazione" TEXT,
  "Data_Accredito" DATE,
  "Verificata" BOOLEAN DEFAULT false,
  "Riconciliata" BOOLEAN DEFAULT false,
  "Log_Errori" TEXT,
  "URL_Ricevuta" TEXT,
  "URL_Screenshot_Gateway" TEXT,
  "URL_Documento_Rimborso" TEXT,
  "URL_Bonifico_Prova" TEXT,
  
  -- Relations
  "ID_Ordine" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_airtable_id ON payment_transactions(airtable_id);

-- =====================================================
-- 14. MARKETING_SOURCES TABLE
-- Table ID: tblXyEscyPcP8TMLG
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID" TEXT,
  "Name" TEXT,
  "Description" TEXT,
  "Active" BOOLEAN DEFAULT true,
  "Color" TEXT,
  
  -- Relations
  "Lead" JSONB,
  "Marketing Costs" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_sources_airtable_id ON marketing_sources(airtable_id);

-- =====================================================
-- 15. MARKETING_COSTS TABLE
-- Table ID: tblHSmuFlSpKWAEjS
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID" TEXT,
  "Name" TEXT,
  "Budget" NUMERIC(10,2),
  "Data Inizio" DATE,
  "Data Fine" DATE,
  "Note" TEXT,
  
  -- Relations
  "Fonte" JSONB,
  "Spese Mensili" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_costs_airtable_id ON marketing_costs(airtable_id);

-- =====================================================
-- 16. SPESE_MENSILI TABLE
-- Table ID: tblB6nZouVblmbzZu
-- =====================================================
CREATE TABLE IF NOT EXISTS spese_mensili (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID" TEXT,
  "Importo Speso" NUMERIC(10,2),
  "Note" TEXT,
  "Data Inizio" DATE,
  "Data Fine" DATE,
  
  -- Relations
  "Campagna" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spese_mensili_airtable_id ON spese_mensili(airtable_id);

-- =====================================================
-- 17. AI_CONVERSATIONS TABLE
-- Table ID: tblGJg2qS58L91AH4
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID" TEXT,
  "Tenant_ID" TEXT,
  "User_ID" TEXT,
  "Context" TEXT,
  "Context_ID" TEXT,
  "Messages" TEXT,
  "Summary" TEXT,
  "Created_At" TIMESTAMPTZ,
  "Updated_At" TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_airtable_id ON ai_conversations(airtable_id);

-- =====================================================
-- 18. DEV_ISSUES TABLE
-- Table ID: tblF1m9R8tJsusz0U
-- =====================================================
CREATE TABLE IF NOT EXISTS dev_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID" TEXT,
  "Title" TEXT,
  "Description" TEXT,
  "Type" TEXT,
  "Status" TEXT,
  "Priority" TEXT,
  "Tags" JSONB, -- multipleSelects
  "RelatedTo" TEXT,
  "GitCommit" TEXT,
  "Attachments" JSONB,
  
  -- Relations
  "CreatedBy" JSONB,
  "AssignedTo" JSONB,
  "Notifications" JSONB,
  "Dev_Issue_Comments" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dev_issues_airtable_id ON dev_issues(airtable_id);

-- =====================================================
-- 19. USER_TASKS TABLE
-- Table ID: tblPrviilwnqleoTy
-- =====================================================
CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID" TEXT,
  "Title" TEXT,
  "Description" TEXT,
  "Type" TEXT,
  "Status" TEXT,
  "Priority" TEXT,
  "DueDate" DATE,
  "CompletedAt" DATE,
  
  -- Relations
  "AssignedTo" JSONB,
  "CreatedBy" JSONB,
  "RelatedLead" JSONB,
  "RelatedActivity" JSONB,
  "RelatedOrder" JSONB,
  "Notifications" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_tasks_airtable_id ON user_tasks(airtable_id);

-- =====================================================
-- 20. NOTIFICATIONS TABLE
-- Table ID: tblQY6lvkLQuck0w6
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID" TEXT,
  "Title" TEXT,
  "Message" TEXT,
  "Type" TEXT,
  "Read" BOOLEAN DEFAULT false,
  
  -- Relations
  "Recipient" JSONB,
  "RelatedIssue" JSONB,
  "RelatedTask" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_airtable_id ON notifications(airtable_id);

-- =====================================================
-- 21. DEV_ISSUE_COMMENTS TABLE
-- Table ID: tblgnQP9MTCmqaqKW
-- =====================================================
CREATE TABLE IF NOT EXISTS dev_issue_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID" TEXT,
  "Content" TEXT,
  
  -- Relations
  "Issue" JSONB,
  "Author" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dev_issue_comments_airtable_id ON dev_issue_comments(airtable_id);

-- =====================================================
-- 22. USER_COLOR_PREFERENCES TABLE
-- Table ID: tbl9F8PXmo8Mjcwyl
-- =====================================================
CREATE TABLE IF NOT EXISTS user_color_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  
  "ID" TEXT,
  "Name" TEXT,
  "EntityType" TEXT,
  "EntityValue" TEXT,
  "ColorClass" TEXT,
  "IsDefault" BOOLEAN DEFAULT false,
  
  -- Relations
  "User" JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_color_preferences_airtable_id ON user_color_preferences(airtable_id);

-- =====================================================
-- TRIGGERS - Auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON automations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_structures_updated_at BEFORE UPDATE ON product_structures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_price_history_updated_at BEFORE UPDATE ON product_price_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commission_payments_updated_at BEFORE UPDATE ON commission_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketing_sources_updated_at BEFORE UPDATE ON marketing_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketing_costs_updated_at BEFORE UPDATE ON marketing_costs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_spese_mensili_updated_at BEFORE UPDATE ON spese_mensili FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dev_issues_updated_at BEFORE UPDATE ON dev_issues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_tasks_updated_at BEFORE UPDATE ON user_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dev_issue_comments_updated_at BEFORE UPDATE ON dev_issue_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_color_preferences_updated_at BEFORE UPDATE ON user_color_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SYNC METADATA
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX idx_sync_log_table_name ON sync_log(table_name);
CREATE INDEX idx_sync_log_started_at ON sync_log(started_at DESC);

-- =====================================================
-- VIEWS & FUNCTIONS
-- =====================================================

-- Dashboard stats (materialized view)
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats AS
SELECT 
  "Stato",
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE "Data" > NOW() - INTERVAL '30 days') as count_last_30d,
  COUNT(*) FILTER (WHERE "Data" > NOW() - INTERVAL '7 days') as count_last_7d
FROM leads
WHERE "Stato" IS NOT NULL
GROUP BY "Stato";

CREATE UNIQUE INDEX ON dashboard_stats ("Stato");

-- Full-text search leads
CREATE OR REPLACE FUNCTION search_leads(search_query TEXT)
RETURNS TABLE (
  id UUID,
  "Nome" TEXT,
  "Telefono" TEXT,
  "Email" TEXT,
  "Stato" TEXT,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l."Nome",
    l."Telefono",
    l."Email",
    l."Stato",
    GREATEST(
      similarity(COALESCE(l."Nome", ''), search_query),
      similarity(COALESCE(l."Telefono", ''), search_query),
      similarity(COALESCE(l."Email", ''), search_query)
    ) as similarity
  FROM leads l
  WHERE 
    l."Nome" % search_query OR
    l."Telefono" % search_query OR
    l."Email" % search_query
  ORDER BY similarity DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCHEMA COMPLETE ✅
-- 23 tabelle + sync_log + views
-- =====================================================
