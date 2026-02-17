-- Add body_type and age_years columns to lead_analyses
-- body_type: muscle/body composition (slim, average, athletic, heavy)
-- age_years: client age for accurate 3D body model
ALTER TABLE lead_analyses
ADD COLUMN IF NOT EXISTS body_type text DEFAULT 'average';

ALTER TABLE lead_analyses
ADD COLUMN IF NOT EXISTS age_years integer;
