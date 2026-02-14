-- Migration 008: sleep_position da text singolo a text[] (multi-select)
-- Permette di selezionare più posizioni (es. laterale + supino)

-- 1. Converti colonna da text a text[]
ALTER TABLE lead_analyses
  ALTER COLUMN sleep_position TYPE text[]
  USING CASE
    WHEN sleep_position IS NULL THEN NULL
    WHEN sleep_position = 'mixed' THEN ARRAY['side', 'supine']::text[]
    ELSE ARRAY[sleep_position]::text[]
  END;

-- 2. Aggiungi CHECK constraint per valori validi
ALTER TABLE lead_analyses
  ADD CONSTRAINT chk_sleep_position_values
  CHECK (
    sleep_position IS NULL
    OR sleep_position <@ ARRAY['side', 'supine', 'prone']::text[]
  );

-- 3. Default a array vuoto per nuove righe (opzionale)
ALTER TABLE lead_analyses
  ALTER COLUMN sleep_position SET DEFAULT ARRAY[]::text[];
