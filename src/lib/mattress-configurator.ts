/**
 * Mattress Configurator Algorithm — Doctorbed
 *
 * Genera configurazioni ideali per 3 modelli (ONE/PLUS/PRO)
 * basandosi sull'anamnesi del cliente.
 *
 * Flow: Peso → Punteggio continuo → Modificatori → Guardrail → Arrotondamento → Livello
 *
 * Tutti i valori sono configurabili via algorithm_settings (DB).
 * I default hardcoded servono solo come fallback.
 */

import type {
  LeadAnalysisCreateInput,
  LeadAnalysisConfig,
  AlgorithmScores,
  AlgorithmSetting,
  BaseDensity,
  CylinderType,
  LumbarCylinderType,
  PillowCervicalSide,
  MattressModel,
  BodyShape,
  SleepPosition,
  FirmnessPreference,
  HealthIssue,
} from '@/types/database';

// ============================================================================
// Types
// ============================================================================

/** Anchor point: weight (kg) → score */
interface WeightAnchor {
  kg: number;
  score: number;
}

/** Settings map loaded from DB (category.key → value) */
export type SettingsMap = Record<string, number>;

/** Full configurator result for one model */
export interface ModelConfiguration {
  model: MattressModel;
  base_density: BaseDensity;
  topper_level: number;
  cylinder_shoulders: CylinderType | null;
  cylinder_lumbar: LumbarCylinderType | null;
  cylinder_legs: CylinderType | null;
  recommend_motorized_base: boolean;
  recommend_pillow: boolean;
  pillow_height_inserts: number | null;
  pillow_cervical_side: PillowCervicalSide | null;
  algorithm_scores: AlgorithmScores;
}

/** Complete configurator output */
export interface ConfiguratorResult {
  one: ModelConfiguration;
  plus: ModelConfiguration;
  pro: ModelConfiguration;
}

// ============================================================================
// Default Settings (fallback if DB not available)
// ============================================================================

const DEFAULT_SETTINGS: SettingsMap = {
  // Weight anchors — Topper (scale 1.0-6.0)
  'weight_anchors_topper.anchor_47kg': 1.0,
  'weight_anchors_topper.anchor_57kg': 2.0,
  'weight_anchors_topper.anchor_70kg': 3.0,
  'weight_anchors_topper.anchor_82kg': 4.0,
  'weight_anchors_topper.anchor_97kg': 5.0,
  'weight_anchors_topper.anchor_122kg': 6.0,

  // Weight anchors — Base (scale 1.0-3.0)
  'weight_anchors_base.anchor_45kg': 1.0,
  'weight_anchors_base.anchor_67kg': 2.0,
  'weight_anchors_base.anchor_95kg': 3.0,

  // Weight anchors — Lumbar cylinders (scale 1.0-3.0)
  'weight_anchors_lumbar.anchor_45kg': 1.0,
  'weight_anchors_lumbar.anchor_70kg': 1.5,
  'weight_anchors_lumbar.anchor_82kg': 2.0,
  'weight_anchors_lumbar.anchor_95kg': 2.5,
  'weight_anchors_lumbar.anchor_110kg': 3.0,

  // Topper modifiers
  'topper_modifiers.side_sleeper': -0.4,
  'topper_modifiers.prone_sleeper': 0.4,
  'topper_modifiers.soft_preference': -0.4,
  'topper_modifiers.firm_preference': 0.4,
  'topper_modifiers.fibromyalgia': -0.3,
  'topper_modifiers.shoulder_pain': -0.2,
  'topper_modifiers.hip_pain': -0.2,
  'topper_modifiers.sciatica': -0.2,
  'topper_modifiers.kyphosis': -0.15,
  'topper_modifiers.lower_back_pain': 0.15,
  'topper_modifiers.lordosis': 0.15,
  'topper_modifiers.a_shape': -0.15,
  'topper_modifiers.v_shape': -0.15,

  // Base modifiers
  'base_modifiers.side_sleeper': -0.15,
  'base_modifiers.prone_sleeper': 0.15,
  'base_modifiers.soft_preference': -0.1,
  'base_modifiers.firm_preference': 0.1,
  'base_modifiers.lower_back_pain': 0.2,
  'base_modifiers.lordosis': 0.2,
  'base_modifiers.fibromyalgia': -0.15,

  // Lumbar cylinder modifiers
  'lumbar_modifiers.side_sleeper': -0.2,
  'lumbar_modifiers.supine_sleeper': 0.2,
  'lumbar_modifiers.prone_sleeper': 0.3,
  'lumbar_modifiers.soft_preference': -0.15,
  'lumbar_modifiers.firm_preference': 0.15,
  'lumbar_modifiers.lower_back_pain': 0.3,
  'lumbar_modifiers.lordosis': 0.25,
  'lumbar_modifiers.sciatica': -0.15,
  'lumbar_modifiers.a_shape': 0.1,

  // Guardrails
  'guardrails.topper_max_deviation': 1.0,
  'guardrails.base_max_deviation': 0.5,
  'guardrails.lumbar_max_deviation': 0.5,

  // Shoulder rules
  'shoulder_rules.light_threshold_kg': 60,
  'shoulder_rules.heavy_threshold_kg': 90,
};

// ============================================================================
// Settings Helper
// ============================================================================

/**
 * Convert AlgorithmSetting[] from DB to flat SettingsMap.
 * Falls back to DEFAULT_SETTINGS for missing keys.
 */
export function buildSettingsMap(dbSettings: AlgorithmSetting[]): SettingsMap {
  const map = { ...DEFAULT_SETTINGS };
  for (const s of dbSettings) {
    map[`${s.category}.${s.key}`] = s.value;
  }
  return map;
}

function getSetting(settings: SettingsMap, key: string): number {
  return settings[key] ?? DEFAULT_SETTINGS[key] ?? 0;
}

// ============================================================================
// Weight → Score (Piecewise Linear Interpolation)
// ============================================================================

function parseAnchors(settings: SettingsMap, category: string): WeightAnchor[] {
  const anchors: WeightAnchor[] = [];
  const prefix = `${category}.anchor_`;

  for (const key of Object.keys(settings)) {
    if (key.startsWith(prefix)) {
      const kgStr = key.slice(prefix.length).replace('kg', '');
      const kg = parseInt(kgStr, 10);
      if (!isNaN(kg)) {
        anchors.push({ kg, score: settings[key] });
      }
    }
  }

  return anchors.sort((a, b) => a.kg - b.kg);
}

/**
 * Piecewise linear interpolation between anchor points.
 * Extrapolates linearly beyond first/last anchor.
 */
function interpolateScore(weight: number, anchors: WeightAnchor[]): number {
  if (anchors.length === 0) return 1;
  if (anchors.length === 1) return anchors[0].score;

  // Below first anchor — extrapolate
  if (weight <= anchors[0].kg) {
    const a = anchors[0];
    const b = anchors[1];
    const slope = (b.score - a.score) / (b.kg - a.kg);
    return a.score + slope * (weight - a.kg);
  }

  // Above last anchor — extrapolate
  const last = anchors[anchors.length - 1];
  if (weight >= last.kg) {
    const prev = anchors[anchors.length - 2];
    const slope = (last.score - prev.score) / (last.kg - prev.kg);
    return last.score + slope * (weight - last.kg);
  }

  // Between anchors — interpolate
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (weight >= a.kg && weight <= b.kg) {
      const t = (weight - a.kg) / (b.kg - a.kg);
      return a.score + t * (b.score - a.score);
    }
  }

  return last.score;
}

// ============================================================================
// Modifiers
// ============================================================================

function computeModifiers(
  input: LeadAnalysisCreateInput,
  settings: SettingsMap,
  category: string,
): number {
  let total = 0;

  // Sleep position
  if (input.sleep_position === 'side') {
    total += getSetting(settings, `${category}.side_sleeper`);
  } else if (input.sleep_position === 'prone') {
    total += getSetting(settings, `${category}.prone_sleeper`);
  } else if (input.sleep_position === 'supine') {
    total += getSetting(settings, `${category}.supine_sleeper`);
  }
  // mixed = 0

  // Firmness preference
  if (input.firmness_preference === 'soft') {
    total += getSetting(settings, `${category}.soft_preference`);
  } else if (input.firmness_preference === 'firm') {
    total += getSetting(settings, `${category}.firm_preference`);
  }

  // Health issues
  const issues = input.health_issues ?? [];
  for (const issue of issues) {
    const val = getSetting(settings, `${category}.${issue}`);
    if (val !== 0) total += val;
  }

  // Body shape
  if (input.body_shape === 'a_shape') {
    total += getSetting(settings, `${category}.a_shape`);
  } else if (input.body_shape === 'v_shape') {
    total += getSetting(settings, `${category}.v_shape`);
  }

  return total;
}

// ============================================================================
// Guardrail
// ============================================================================

function applyGuardrail(
  weightScore: number,
  finalScore: number,
  maxDeviation: number,
  min: number,
  max: number,
): { score: number; applied: boolean } {
  const clampedByGuardrail = Math.max(
    weightScore - maxDeviation,
    Math.min(weightScore + maxDeviation, finalScore),
  );
  const clamped = Math.max(min, Math.min(max, clampedByGuardrail));
  return {
    score: clamped,
    applied: clamped !== finalScore,
  };
}

// ============================================================================
// Score → Discrete Level Mapping
// ============================================================================

function scoreToBaseDensity(score: number): BaseDensity {
  const rounded = Math.round(score);
  if (rounded <= 1) return 'soft';
  if (rounded >= 3) return 'hard';
  return 'medium';
}

function scoreToTopperLevel(score: number): number {
  return Math.max(1, Math.min(6, Math.round(score)));
}

function scoreToLumbarCylinder(score: number): LumbarCylinderType {
  const rounded = Math.round(score);
  if (rounded <= 1) return 'soft_8';
  if (rounded >= 3) return 'firm_8';
  return 'medium_8';
}

// ============================================================================
// Shoulder Cylinders
// ============================================================================

function computeShoulderCylinder(
  input: LeadAnalysisCreateInput,
  settings: SettingsMap,
): CylinderType {
  const lightThreshold = getSetting(settings, 'shoulder_rules.light_threshold_kg');
  const heavyThreshold = getSetting(settings, 'shoulder_rules.heavy_threshold_kg');

  const isNarrowShoulders = input.body_shape === 'a_shape' || input.body_shape === 'normal';
  const isSide = input.sleep_position === 'side';

  // Very light + side + narrow shoulders → no cylinder (empty cavity)
  if (input.weight_kg < lightThreshold && isSide && isNarrowShoulders) {
    return 'none';
  }

  // Heavy → Soft 8cm
  if (input.weight_kg > heavyThreshold) {
    // V-shape pushes towards softer → keep Super Soft even for heavier
    if (input.body_shape === 'v_shape' && input.weight_kg <= heavyThreshold + 10) {
      return 'super_soft_6';
    }
    return 'soft_8';
  }

  // Default range: Super Soft 6cm
  return 'super_soft_6';
}

// ============================================================================
// Constraints: Base ↔ Cylinders
// ============================================================================

/** Lumbar can never be Super Soft. Lumbar must be ≥ shoulders in stiffness. */
const CYLINDER_STIFFNESS_ORDER: Record<string, number> = {
  'none': 0,
  'super_soft_6': 1,
  'soft_8': 2,
  'medium_8': 3,
  'firm_8': 4,
};

function enforceConstraints(
  baseDensity: BaseDensity,
  shoulders: CylinderType,
  lumbar: LumbarCylinderType,
): { shoulders: CylinderType; lumbar: LumbarCylinderType } {
  let adjShoulders = shoulders;
  let adjLumbar = lumbar;

  // Base Soft: cylinders max Medium (no Firm), except shoulders always allowed Super Soft
  if (baseDensity === 'soft') {
    if (adjLumbar === 'firm_8') adjLumbar = 'medium_8';
    if (adjShoulders === 'firm_8') adjShoulders = 'medium_8';
  }

  // Base Hard: lumbar at least Medium
  if (baseDensity === 'hard') {
    if (adjLumbar === 'soft_8') adjLumbar = 'medium_8';
  }

  // Lumbar ≥ shoulders in stiffness
  const lumbarStiff = CYLINDER_STIFFNESS_ORDER[adjLumbar] ?? 2;
  const shoulderStiff = CYLINDER_STIFFNESS_ORDER[adjShoulders] ?? 1;
  if (lumbarStiff < shoulderStiff) {
    // Bump lumbar up to match shoulders (but not to super_soft)
    if (shoulderStiff >= 3) adjLumbar = 'medium_8';
    if (shoulderStiff >= 4) adjLumbar = 'firm_8';
  }

  return { shoulders: adjShoulders, lumbar: adjLumbar };
}

// ============================================================================
// Accessories
// ============================================================================

function shouldRecommendMotorizedBase(input: LeadAnalysisCreateInput): boolean {
  const issues = input.health_issues ?? [];
  return (
    input.circulation_issues === true ||
    input.snoring_apnea === true ||
    input.reads_watches_in_bed === true ||
    issues.includes('lower_back_pain')
  );
}

function computePillow(input: LeadAnalysisCreateInput): {
  recommend: boolean;
  inserts: number;
  cervicalSide: PillowCervicalSide;
} {
  // Always recommend pillow
  const recommend = true;

  // Height inserts: based on body shape (shoulder width) + sleep position
  let inserts = 2; // default medium
  if (input.body_shape === 'v_shape') {
    inserts = 3; // wide shoulders → higher pillow
  } else if (input.body_shape === 'a_shape' || input.body_shape === 'normal') {
    inserts = 2;
  } else if (input.body_shape === 'h_shape') {
    inserts = 2;
  } else if (input.body_shape === 'round') {
    inserts = 2;
  }

  // Side sleeper needs higher pillow
  if (input.sleep_position === 'side') {
    inserts = Math.min(4, inserts + 1);
  }
  // Prone sleeper needs lower pillow
  if (input.sleep_position === 'prone') {
    inserts = Math.max(0, inserts - 1);
  }

  // Cervical side
  const issues = input.health_issues ?? [];
  const hasCervicalPain = issues.includes('kyphosis');
  const cervicalSide: PillowCervicalSide = hasCervicalPain ? 'pronounced' : 'gentle';

  return { recommend, inserts, cervicalSide };
}

// ============================================================================
// Main Algorithm
// ============================================================================

/**
 * Generate mattress configurations for all 3 models.
 *
 * @param input - Lead analysis input (anamnesis data)
 * @param settings - Algorithm settings (from DB or DEFAULT_SETTINGS)
 * @returns ConfiguratorResult with ONE, PLUS, PRO configurations
 */
export function generateConfigurations(
  input: LeadAnalysisCreateInput,
  settings: SettingsMap = DEFAULT_SETTINGS,
): ConfiguratorResult {
  // ---- Weight scores ----
  const topperAnchors = parseAnchors(settings, 'weight_anchors_topper');
  const baseAnchors = parseAnchors(settings, 'weight_anchors_base');
  const lumbarAnchors = parseAnchors(settings, 'weight_anchors_lumbar');

  const weightScoreTopper = interpolateScore(input.weight_kg, topperAnchors);
  const weightScoreBase = interpolateScore(input.weight_kg, baseAnchors);
  const weightScoreLumbar = interpolateScore(input.weight_kg, lumbarAnchors);

  // ---- Modifiers ----
  const modTopper = computeModifiers(input, settings, 'topper_modifiers');
  const modBase = computeModifiers(input, settings, 'base_modifiers');
  const modLumbar = computeModifiers(input, settings, 'lumbar_modifiers');

  // ---- Raw final scores ----
  const rawTopper = weightScoreTopper + modTopper;
  const rawBase = weightScoreBase + modBase;
  const rawLumbar = weightScoreLumbar + modLumbar;

  // ---- Guardrails ----
  const guardrailTopper = applyGuardrail(
    weightScoreTopper, rawTopper,
    getSetting(settings, 'guardrails.topper_max_deviation'),
    1.0, 6.0,
  );
  const guardrailBase = applyGuardrail(
    weightScoreBase, rawBase,
    getSetting(settings, 'guardrails.base_max_deviation'),
    1.0, 3.0,
  );
  const guardrailLumbar = applyGuardrail(
    weightScoreLumbar, rawLumbar,
    getSetting(settings, 'guardrails.lumbar_max_deviation'),
    1.0, 3.0,
  );

  const guardrailApplied =
    guardrailTopper.applied || guardrailBase.applied || guardrailLumbar.applied;

  // ---- Discrete levels ----
  const baseDensity = scoreToBaseDensity(guardrailBase.score);
  const topperLevel = scoreToTopperLevel(guardrailTopper.score);
  const lumbarCylinder = scoreToLumbarCylinder(guardrailLumbar.score);

  // ---- Shoulders & constraints (PRO only) ----
  const shoulderCylinder = computeShoulderCylinder(input, settings);
  const constrained = enforceConstraints(baseDensity, shoulderCylinder, lumbarCylinder);

  // ---- Accessories ----
  const motorized = shouldRecommendMotorizedBase(input);
  const pillow = computePillow(input);

  // ---- Algorithm scores (for audit/debug) ----
  const scores: AlgorithmScores = {
    weight_score_topper: round2(weightScoreTopper),
    weight_score_base: round2(weightScoreBase),
    weight_score_lumbar: round2(weightScoreLumbar),
    modifier_total_topper: round2(modTopper),
    modifier_total_base: round2(modBase),
    modifier_total_lumbar: round2(modLumbar),
    final_score_topper: round2(guardrailTopper.score),
    final_score_base: round2(guardrailBase.score),
    final_score_lumbar: round2(guardrailLumbar.score),
    guardrail_applied: guardrailApplied,
  };

  // ---- ONE: fixed topper (2.5+2.5), no cylinders ----
  const one: ModelConfiguration = {
    model: 'one',
    base_density: baseDensity,
    topper_level: 3, // Fixed: ONE has 5cm topper (2.5 soft + 2.5 hard), mapped to "level 3" conceptually
    cylinder_shoulders: null,
    cylinder_lumbar: null,
    cylinder_legs: null,
    recommend_motorized_base: motorized,
    recommend_pillow: pillow.recommend,
    pillow_height_inserts: pillow.inserts,
    pillow_cervical_side: pillow.cervicalSide,
    algorithm_scores: scores,
  };

  // ---- PLUS: configurable topper + base, no cylinders ----
  const plus: ModelConfiguration = {
    model: 'plus',
    base_density: baseDensity,
    topper_level: topperLevel,
    cylinder_shoulders: null,
    cylinder_lumbar: null,
    cylinder_legs: null,
    recommend_motorized_base: motorized,
    recommend_pillow: pillow.recommend,
    pillow_height_inserts: pillow.inserts,
    pillow_cervical_side: pillow.cervicalSide,
    algorithm_scores: scores,
  };

  // ---- PRO: topper + base + cylinders ----
  const pro: ModelConfiguration = {
    model: 'pro',
    base_density: baseDensity,
    topper_level: topperLevel,
    cylinder_shoulders: constrained.shoulders,
    cylinder_lumbar: constrained.lumbar,
    cylinder_legs: constrained.shoulders, // Legs mirror shoulders
    recommend_motorized_base: motorized,
    recommend_pillow: pillow.recommend,
    pillow_height_inserts: pillow.inserts,
    pillow_cervical_side: pillow.cervicalSide,
    algorithm_scores: scores,
  };

  return { one, plus, pro };
}

// ============================================================================
// Helpers
// ============================================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Convert a ModelConfiguration to a partial LeadAnalysisConfig shape
 * ready for DB insertion.
 */
export function configToDbRow(
  config: ModelConfiguration,
  analysisId: string,
): Omit<LeadAnalysisConfig, 'id' | 'created_at'> {
  return {
    analysis_id: analysisId,
    model: config.model,
    base_density: config.base_density,
    topper_level: config.topper_level,
    cylinder_shoulders: config.cylinder_shoulders,
    cylinder_lumbar: config.cylinder_lumbar,
    cylinder_legs: config.cylinder_legs,
    recommend_motorized_base: config.recommend_motorized_base,
    recommend_pillow: config.recommend_pillow,
    pillow_height_inserts: config.pillow_height_inserts,
    pillow_cervical_side: config.pillow_cervical_side,
    is_manual_override: false,
    algorithm_scores: config.algorithm_scores,
  };
}
