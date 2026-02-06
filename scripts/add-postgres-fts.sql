-- ============================================================================
-- POSTGRES FULL-TEXT SEARCH (FTS) SETUP
-- Esegui su Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. LEADS FULL-TEXT SEARCH
-- ----------------------------------------------------------------------------

-- Aggiungi colonna tsvector per search ottimizzato
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Popola con dati esistenti (1006 lead)
UPDATE leads 
SET search_vector = 
  to_tsvector('italian', 
    COALESCE("Nome", '') || ' ' || 
    COALESCE("Telefono", '') || ' ' ||
    COALESCE("Email", '') || ' ' ||
    COALESCE("Città", '') || ' ' ||
    COALESCE("Indirizzo", '') || ' ' ||
    COALESCE("Esigenza", '')
  )
WHERE search_vector IS NULL;

-- Crea indice GIN (Generalized Inverted Index) - molto veloce per FTS
CREATE INDEX IF NOT EXISTS idx_leads_search 
ON leads USING gin(search_vector);

-- Trigger per auto-update search_vector su INSERT/UPDATE
CREATE OR REPLACE FUNCTION leads_search_trigger() 
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    to_tsvector('italian',
      COALESCE(NEW."Nome", '') || ' ' || 
      COALESCE(NEW."Telefono", '') || ' ' ||
      COALESCE(NEW."Email", '') || ' ' ||
      COALESCE(NEW."Città", '') || ' ' ||
      COALESCE(NEW."Indirizzo", '') || ' ' ||
      COALESCE(NEW."Esigenza", '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_leads_search_vector ON leads;
CREATE TRIGGER update_leads_search_vector 
BEFORE INSERT OR UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION leads_search_trigger();


-- 2. ACTIVITIES FULL-TEXT SEARCH
-- ----------------------------------------------------------------------------

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE activities 
SET search_vector = 
  to_tsvector('italian', 
    COALESCE("Titolo", '') || ' ' || 
    COALESCE("Tipo", '') || ' ' ||
    COALESCE("Note", '') || ' ' ||
    COALESCE("Esito", '')
  )
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_activities_search 
ON activities USING gin(search_vector);

CREATE OR REPLACE FUNCTION activities_search_trigger() 
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    to_tsvector('italian',
      COALESCE(NEW."Titolo", '') || ' ' || 
      COALESCE(NEW."Tipo", '') || ' ' ||
      COALESCE(NEW."Note", '') || ' ' ||
      COALESCE(NEW."Esito", '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_activities_search_vector ON activities;
CREATE TRIGGER update_activities_search_vector 
BEFORE INSERT OR UPDATE ON activities
FOR EACH ROW EXECUTE FUNCTION activities_search_trigger();


-- 3. PRODUCTS FULL-TEXT SEARCH
-- ----------------------------------------------------------------------------

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE products 
SET search_vector = 
  to_tsvector('italian', 
    COALESCE("Nome_Prodotto", '') || ' ' || 
    COALESCE("Descrizione", '') || ' ' ||
    COALESCE("Categoria", '') || ' ' ||
    COALESCE("Codice_Matrice", '')
  )
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_search 
ON products USING gin(search_vector);

CREATE OR REPLACE FUNCTION products_search_trigger() 
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    to_tsvector('italian',
      COALESCE(NEW."Nome_Prodotto", '') || ' ' || 
      COALESCE(NEW."Descrizione", '') || ' ' ||
      COALESCE(NEW."Categoria", '') || ' ' ||
      COALESCE(NEW."Codice_Matrice", '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_search_vector ON products;
CREATE TRIGGER update_products_search_vector 
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION products_search_trigger();


-- 4. ORDERS FULL-TEXT SEARCH
-- ----------------------------------------------------------------------------

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE orders 
SET search_vector = 
  to_tsvector('italian', 
    COALESCE("ID_Ordine", '') || ' ' || 
    COALESCE("Note_Cliente", '') || ' ' ||
    COALESCE("Note_Interne", '') || ' ' ||
    COALESCE("Stato_Ordine", '')
  )
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_search 
ON orders USING gin(search_vector);

CREATE OR REPLACE FUNCTION orders_search_trigger() 
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    to_tsvector('italian',
      COALESCE(NEW."ID_Ordine", '') || ' ' || 
      COALESCE(NEW."Note_Cliente", '') || ' ' ||
      COALESCE(NEW."Note_Interne", '') || ' ' ||
      COALESCE(NEW."Stato_Ordine", '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_orders_search_vector ON orders;
CREATE TRIGGER update_orders_search_vector 
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION orders_search_trigger();


-- ============================================================================
-- VERIFICA SETUP FTS
-- ============================================================================

-- Test search su leads (cerca "mario rossi")
SELECT 
  "Nome", 
  "Telefono", 
  "Email", 
  ts_rank(search_vector, query) AS rank
FROM leads, 
     to_tsquery('italian', 'mario & rossi') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 10;

-- Verifica indici creati
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE '%search%'
ORDER BY tablename, indexname;

-- Verifica trigger creati
SELECT 
  trigger_schema,
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%search%'
ORDER BY event_object_table, trigger_name;
