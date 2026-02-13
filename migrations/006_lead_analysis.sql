-- ============================================================================
-- Migration 006: Lead Analysis (Anamnesi & Configuratore Materasso)
-- ============================================================================
-- Tabelle: lead_analyses, lead_analysis_configs, algorithm_settings
-- Scopo: analisi fisiche del lead → configurazione automatica materasso
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. lead_analyses — anamnesi del lead
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_analyses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  person_label          TEXT DEFAULT 'Partner 1',
  sex                   TEXT CHECK (sex IN ('male', 'female')),
  weight_kg             INTEGER NOT NULL CHECK (weight_kg BETWEEN 30 AND 250),
  height_cm             INTEGER NOT NULL CHECK (height_cm BETWEEN 100 AND 230),
  body_shape            TEXT CHECK (body_shape IN ('v_shape', 'a_shape', 'normal', 'h_shape', 'round')),
  sleep_position        TEXT CHECK (sleep_position IN ('side', 'supine', 'prone', 'mixed')),
  firmness_preference   TEXT CHECK (firmness_preference IN ('soft', 'neutral', 'firm')) DEFAULT 'neutral',
  health_issues         TEXT[] DEFAULT '{}',
  circulation_issues    BOOLEAN DEFAULT false,
  snoring_apnea         BOOLEAN DEFAULT false,
  reads_watches_in_bed  BOOLEAN DEFAULT false,
  mattress_width_cm     INTEGER CHECK (mattress_width_cm > 0),
  mattress_length_cm    INTEGER CHECK (mattress_length_cm > 0),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indici
CREATE INDEX idx_lead_analyses_lead_id ON lead_analyses(lead_id);
CREATE INDEX idx_lead_analyses_created_at ON lead_analyses(created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_lead_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lead_analyses_updated_at
  BEFORE UPDATE ON lead_analyses
  FOR EACH ROW EXECUTE FUNCTION update_lead_analyses_updated_at();

-- ============================================================================
-- 2. lead_analysis_configs — configurazione generata per ogni modello
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_analysis_configs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id               UUID NOT NULL REFERENCES lead_analyses(id) ON DELETE CASCADE,
  model                     TEXT NOT NULL CHECK (model IN ('one', 'plus', 'pro')),
  base_density              TEXT NOT NULL CHECK (base_density IN ('soft', 'medium', 'hard')),
  topper_level              INTEGER NOT NULL CHECK (topper_level BETWEEN 1 AND 6),
  cylinder_shoulders        TEXT CHECK (cylinder_shoulders IN ('none', 'super_soft_6', 'soft_8', 'medium_8', 'firm_8')),
  cylinder_lumbar           TEXT CHECK (cylinder_lumbar IN ('soft_8', 'medium_8', 'firm_8')),
  cylinder_legs             TEXT CHECK (cylinder_legs IN ('none', 'super_soft_6', 'soft_8', 'medium_8', 'firm_8')),
  recommend_motorized_base  BOOLEAN DEFAULT false,
  recommend_pillow          BOOLEAN DEFAULT false,
  pillow_height_inserts     INTEGER CHECK (pillow_height_inserts BETWEEN 0 AND 4),
  pillow_cervical_side      TEXT CHECK (pillow_cervical_side IN ('gentle', 'pronounced')),
  is_manual_override        BOOLEAN DEFAULT false,
  algorithm_scores          JSONB DEFAULT '{}',
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_lead_analysis_configs_analysis_id ON lead_analysis_configs(analysis_id);
CREATE UNIQUE INDEX idx_lead_analysis_configs_unique_model ON lead_analysis_configs(analysis_id, model);

-- ============================================================================
-- 3. algorithm_settings — parametri algoritmo configurabili da admin
-- ============================================================================

CREATE TABLE IF NOT EXISTS algorithm_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       DOUBLE PRECISION NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  min_value   DOUBLE PRECISION,
  max_value   DOUBLE PRECISION,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_algorithm_settings_category_key UNIQUE (category, key)
);

CREATE INDEX idx_algorithm_settings_category ON algorithm_settings(category);

-- Trigger updated_at
CREATE TRIGGER trg_algorithm_settings_updated_at
  BEFORE UPDATE ON algorithm_settings
  FOR EACH ROW EXECUTE FUNCTION update_lead_analyses_updated_at();

-- ============================================================================
-- 4. Seed valori default algorithm_settings
-- ============================================================================

-- Weight anchors — Topper (scala 1.0-6.0)
INSERT INTO algorithm_settings (category, key, value, label, description, min_value, max_value) VALUES
  ('weight_anchors_topper', 'anchor_47kg', 1.0, 'Ancora 47kg → Topper', 'Peso 47kg corrisponde a topper level 1.0', 0.5, 2.0),
  ('weight_anchors_topper', 'anchor_57kg', 2.0, 'Ancora 57kg → Topper', 'Peso 57kg corrisponde a topper level 2.0', 1.0, 3.0),
  ('weight_anchors_topper', 'anchor_70kg', 3.0, 'Ancora 70kg → Topper', 'Peso 70kg corrisponde a topper level 3.0', 2.0, 4.0),
  ('weight_anchors_topper', 'anchor_82kg', 4.0, 'Ancora 82kg → Topper', 'Peso 82kg corrisponde a topper level 4.0', 3.0, 5.0),
  ('weight_anchors_topper', 'anchor_97kg', 5.0, 'Ancora 97kg → Topper', 'Peso 97kg corrisponde a topper level 5.0', 4.0, 6.0),
  ('weight_anchors_topper', 'anchor_122kg', 6.0, 'Ancora 122kg → Topper', 'Peso 122kg corrisponde a topper level 6.0', 5.0, 6.5);

-- Weight anchors — Base (scala 1.0-3.0)
INSERT INTO algorithm_settings (category, key, value, label, description, min_value, max_value) VALUES
  ('weight_anchors_base', 'anchor_45kg', 1.0, 'Ancora 45kg → Base', 'Peso 45kg = base Soft (1.0)', 0.5, 1.5),
  ('weight_anchors_base', 'anchor_67kg', 2.0, 'Ancora 67kg → Base', 'Peso 67kg = base Medium (2.0)', 1.5, 2.5),
  ('weight_anchors_base', 'anchor_95kg', 3.0, 'Ancora 95kg → Base', 'Peso 95kg = base Hard (3.0)', 2.5, 3.5);

-- Weight anchors — Cilindri lombare (scala 1.0-3.0)
INSERT INTO algorithm_settings (category, key, value, label, description, min_value, max_value) VALUES
  ('weight_anchors_lumbar', 'anchor_45kg', 1.0, 'Ancora 45kg → Lombare', 'Peso 45kg = cilindro Soft (1.0)', 0.5, 1.5),
  ('weight_anchors_lumbar', 'anchor_70kg', 1.5, 'Ancora 70kg → Lombare', 'Peso 70kg = tra Soft e Medium', 1.0, 2.0),
  ('weight_anchors_lumbar', 'anchor_82kg', 2.0, 'Ancora 82kg → Lombare', 'Peso 82kg = cilindro Medium (2.0)', 1.5, 2.5),
  ('weight_anchors_lumbar', 'anchor_95kg', 2.5, 'Ancora 95kg → Lombare', 'Peso 95kg = tra Medium e Firm', 2.0, 3.0),
  ('weight_anchors_lumbar', 'anchor_110kg', 3.0, 'Ancora 110kg → Lombare', 'Peso 110kg = cilindro Firm (3.0)', 2.5, 3.5);

-- Topper modifiers
INSERT INTO algorithm_settings (category, key, value, label, description, min_value, max_value) VALUES
  ('topper_modifiers', 'side_sleeper', -0.4, 'Side sleeper → Topper', 'Dorme su un fianco: topper più morbido', -1.0, 0.0),
  ('topper_modifiers', 'prone_sleeper', 0.4, 'Prono → Topper', 'Dorme a pancia in giù: topper più rigido', 0.0, 1.0),
  ('topper_modifiers', 'soft_preference', -0.4, 'Preferenza accogliente → Topper', 'Preferisce sensazione morbida', -1.0, 0.0),
  ('topper_modifiers', 'firm_preference', 0.4, 'Preferenza sostenuto → Topper', 'Preferisce sensazione rigida', 0.0, 1.0),
  ('topper_modifiers', 'fibromyalgia', -0.3, 'Fibromialgia → Topper', 'Necessita distribuzione pressione', -1.0, 0.0),
  ('topper_modifiers', 'shoulder_pain', -0.2, 'Dolore spalle → Topper', 'Spalle necessitano affondamento', -1.0, 0.0),
  ('topper_modifiers', 'hip_pain', -0.2, 'Dolore anche → Topper', 'Anche necessitano affondamento', -1.0, 0.0),
  ('topper_modifiers', 'sciatica', -0.2, 'Sciatica → Topper', 'Necessita rilascio pressione nervo', -1.0, 0.0),
  ('topper_modifiers', 'kyphosis', -0.15, 'Cifosi → Topper', 'Cifosi: topper leggermente più morbido', -1.0, 0.0),
  ('topper_modifiers', 'lower_back_pain', 0.15, 'Dolore lombare → Topper', 'Lombare: topper leggermente più rigido', 0.0, 1.0),
  ('topper_modifiers', 'lordosis', 0.15, 'Lordosi → Topper', 'Lordosi: topper leggermente più rigido', 0.0, 1.0),
  ('topper_modifiers', 'a_shape', -0.15, 'A-shape → Topper', 'Fianchi larghi: topper più morbido', -1.0, 0.0),
  ('topper_modifiers', 'v_shape', -0.15, 'V-shape → Topper', 'Spalle larghe: topper più morbido', -1.0, 0.0);

-- Base modifiers
INSERT INTO algorithm_settings (category, key, value, label, description, min_value, max_value) VALUES
  ('base_modifiers', 'side_sleeper', -0.15, 'Side sleeper → Base', 'Dorme su un fianco: base più morbida', -0.5, 0.0),
  ('base_modifiers', 'prone_sleeper', 0.15, 'Prono → Base', 'Dorme a pancia in giù: base più rigida', 0.0, 0.5),
  ('base_modifiers', 'soft_preference', -0.1, 'Preferenza accogliente → Base', 'Preferisce sensazione morbida', -0.5, 0.0),
  ('base_modifiers', 'firm_preference', 0.1, 'Preferenza sostenuto → Base', 'Preferisce sensazione rigida', 0.0, 0.5),
  ('base_modifiers', 'lower_back_pain', 0.2, 'Dolore lombare → Base', 'Lombare: base più sostenuta', 0.0, 0.5),
  ('base_modifiers', 'lordosis', 0.2, 'Lordosi → Base', 'Lordosi: base più sostenuta', 0.0, 0.5),
  ('base_modifiers', 'fibromyalgia', -0.15, 'Fibromialgia → Base', 'Necessita distribuzione pressione', -0.5, 0.0);

-- Lumbar cylinder modifiers
INSERT INTO algorithm_settings (category, key, value, label, description, min_value, max_value) VALUES
  ('lumbar_modifiers', 'side_sleeper', -0.2, 'Side sleeper → Lombare', 'Dorme su un fianco: lombare più morbido', -0.5, 0.0),
  ('lumbar_modifiers', 'supine_sleeper', 0.2, 'Supino → Lombare', 'Dorme supino: lombare più rigido', 0.0, 0.5),
  ('lumbar_modifiers', 'prone_sleeper', 0.3, 'Prono → Lombare', 'Dorme a pancia in giù: lombare più rigido', 0.0, 0.5),
  ('lumbar_modifiers', 'soft_preference', -0.15, 'Preferenza accogliente → Lombare', 'Preferisce sensazione morbida', -0.5, 0.0),
  ('lumbar_modifiers', 'firm_preference', 0.15, 'Preferenza sostenuto → Lombare', 'Preferisce sensazione rigida', 0.0, 0.5),
  ('lumbar_modifiers', 'lower_back_pain', 0.3, 'Dolore lombare → Lombare', 'Dolore lombare: sostegno extra', 0.0, 0.5),
  ('lumbar_modifiers', 'lordosis', 0.25, 'Lordosi → Lombare', 'Lordosi: sostegno extra lombare', 0.0, 0.5),
  ('lumbar_modifiers', 'sciatica', -0.15, 'Sciatica → Lombare', 'Sciatica: rilascio pressione', -0.5, 0.0),
  ('lumbar_modifiers', 'a_shape', 0.1, 'A-shape → Lombare', 'Fianchi larghi: sostegno lombare', 0.0, 0.5);

-- Guardrails
INSERT INTO algorithm_settings (category, key, value, label, description, min_value, max_value) VALUES
  ('guardrails', 'topper_max_deviation', 1.0, 'Max deviazione topper', 'Massimo scostamento dal punteggio peso (topper)', 0.5, 2.0),
  ('guardrails', 'base_max_deviation', 0.5, 'Max deviazione base', 'Massimo scostamento dal punteggio peso (base)', 0.25, 1.0),
  ('guardrails', 'lumbar_max_deviation', 0.5, 'Max deviazione lombare', 'Massimo scostamento dal punteggio peso (lombare)', 0.25, 1.0);

-- Shoulder rules
INSERT INTO algorithm_settings (category, key, value, label, description, min_value, max_value) VALUES
  ('shoulder_rules', 'light_threshold_kg', 60, 'Soglia peso leggero (spalle)', 'Sotto questo peso + side + strette → nessun cilindro', 45, 75),
  ('shoulder_rules', 'heavy_threshold_kg', 90, 'Soglia peso pesante (spalle)', 'Sopra questo peso → Soft 8cm', 75, 120);

COMMIT;
