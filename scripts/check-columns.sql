-- Diagnostica: Verifica nomi colonne effettivi nelle tabelle
-- Esegui su Supabase SQL Editor

-- 1. Colonne tabella LEADS
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'leads'
ORDER BY ordinal_position;

-- 2. Colonne tabella ACTIVITIES
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'activities'
ORDER BY ordinal_position;

-- 3. Colonne tabella PRODUCTS
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'products'
ORDER BY ordinal_position;

-- 4. Colonne tabella ORDERS
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

-- 5. Test query su leads (verifica dati)
SELECT * FROM leads LIMIT 1;
