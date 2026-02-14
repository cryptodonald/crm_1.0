/**
 * Body Model Types — Anny 3D Body + Point Cloud
 *
 * Types for the parametric body model system used in mattress
 * pressure analysis and zone customization.
 */

// ─── Body Zones ─────────────────────────────────────────────────────────────

/** The 7 mattress-relevant body zones derived from Anny bone labels */
export const BODY_ZONES = [
  'head_neck',
  'shoulders',
  'upper_back',
  'lumbar',
  'pelvis_hips',
  'thighs',
  'lower_legs_feet',
] as const;

export type BodyZone = (typeof BODY_ZONES)[number];

/** Italian labels for body zones */
export const BODY_ZONE_LABELS: Record<BodyZone, string> = {
  head_neck: 'Testa / Collo',
  shoulders: 'Spalle',
  upper_back: 'Schiena Alta',
  lumbar: 'Zona Lombare',
  pelvis_hips: 'Bacino / Anche',
  thighs: 'Cosce',
  lower_legs_feet: 'Gambe / Piedi',
};

// ─── Zone Overrides ─────────────────────────────────────────────────────────

/** Manual zone adjustments from the zone editor. Range: [-0.5, +0.5] */
export type ZoneOverrides = {
  shoulders: number;
  chest: number;
  waist: number;
  hips: number;
  thighs: number;
  calves: number;
};

export const DEFAULT_ZONE_OVERRIDES: ZoneOverrides = {
  shoulders: 0,
  chest: 0,
  waist: 0,
  hips: 0,
  thighs: 0,
  calves: 0,
};

// ─── Body Model Parameters ──────────────────────────────────────────────────

export type BodyGender = 'male' | 'female';
export type BodyType = 'slim' | 'average' | 'athletic' | 'heavy';
export type BodyPose = 'standing' | 'supine' | 'prone' | 'lateral' | 'hybrid';

export interface BodyModelParams {
  height_cm: number;
  weight_kg: number;
  gender: BodyGender;
  body_type: BodyType;
  pose: BodyPose;
  age_years?: number; // 20-80, affects body composition and pressure distribution
  zone_overrides?: ZoneOverrides;
}

// ─── Point Cloud Data ───────────────────────────────────────────────────────

export interface PointCloudZoneStats {
  num_points: number;
  mass_kg: number;
  mass_percent: number;
}

export interface PointCloudMetadata {
  num_points: number;
  total_weight_kg: number;
  zone_order: BodyZone[];
  zone_stats: Record<BodyZone, PointCloudZoneStats>;
}

/** Response from POST /api/body-model/pointcloud */
export interface PointCloudResponse {
  /** Flat array of [x,y,z] positions — length = num_points */
  positions: number[][];
  /** Flat array of [nx,ny,nz] normals — length = num_points */
  normals: number[][];
  /** Zone index per point (index into BODY_ZONES) */
  zone_indices: number[];
  /** Mass in kg per point */
  mass_fractions: number[];
  metadata: PointCloudMetadata;
  generation_time_s: number;
}
