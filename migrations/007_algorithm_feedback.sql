-- ============================================================================
-- Migration 007: Algorithm Self-Learning (Feedback & Corrections)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. algorithm_feedback — traccia overrides dei consulenti
-- ============================================================================

CREATE TABLE IF NOT EXISTS algorithm_feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id       UUID NOT NULL REFERENCES lead_analyses(id) ON DELETE CASCADE,
  config_id         UUID NOT NULL REFERENCES lead_analysis_configs(id) ON DELETE CASCADE,
  model             TEXT NOT NULL CHECK (model IN ('one', 'plus', 'pro')),
  parameter         TEXT NOT NULL,
  algorithm_value   TEXT NOT NULL,
  final_value       TEXT NOT NULL,
  delta             DOUBLE PRECISION NOT NULL DEFAULT 0,
  input_snapshot    JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  consultant_id     UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_algorithm_feedback_parameter ON algorithm_feedback(parameter);
CREATE INDEX idx_algorithm_feedback_created_at ON algorithm_feedback(created_at DESC);
CREATE INDEX idx_algorithm_feedback_analysis_id ON algorithm_feedback(analysis_id);

-- ============================================================================
-- 2. algorithm_corrections — fattori di correzione calcolati
-- ============================================================================

CREATE TABLE IF NOT EXISTS algorithm_corrections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter         TEXT NOT NULL,
  input_conditions  JSONB NOT NULL DEFAULT '{}',
  correction_factor DOUBLE PRECISION NOT NULL DEFAULT 0,
  sample_size       INTEGER NOT NULL DEFAULT 0,
  confidence        DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_algorithm_corrections_param_conditions UNIQUE (parameter, input_conditions)
);

CREATE INDEX idx_algorithm_corrections_parameter ON algorithm_corrections(parameter);
CREATE INDEX idx_algorithm_corrections_confidence ON algorithm_corrections(confidence DESC);

COMMIT;
