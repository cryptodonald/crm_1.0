-- Migration 008: sleep_position da text singolo a text[] (multi-select)
-- Permette di selezionare più posizioni (es. laterale + supino)

BEGIN;

-- 1. Drop vecchio CHECK constraint (text = ANY(text[]))
ALTER TABLE lead_analyses
  DROP CONSTRAINT IF EXISTS lead_analyses_sleep_position_check;

-- 2. Converti colonna da text a text[]
ALTER TABLE lead_analyses
  ALTER COLUMN sleep_position TYPE text[]
  USING CASE
    WHEN sleep_position IS NULL THEN NULL
    WHEN sleep_position = 'mixed' THEN ARRAY['side', 'supine']::text[]
    ELSE ARRAY[sleep_position]::text[]
  END;

-- 3. Nuovo CHECK constraint per array subset
ALTER TABLE lead_analyses
  ADD CONSTRAINT chk_sleep_position_values
  CHECK (
    sleep_position IS NULL
    OR sleep_position <@ ARRAY['side', 'supine', 'prone']::text[]
  );

-- 4. Default array vuoto per nuove righe
ALTER TABLE lead_analyses
  ALTER COLUMN sleep_position SET DEFAULT ARRAY[]::text[];

COMMIT;
