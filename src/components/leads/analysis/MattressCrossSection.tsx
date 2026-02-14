'use client';

import type { LeadAnalysisConfig } from '@/types/database';

interface MattressCrossSectionProps {
  config: LeadAnalysisConfig;
  isOne?: boolean;
}

// ============================================================================
// Color scales using CSS custom properties where possible.
// SVG fill/stroke require computed values — we use semantic oklch tokens
// from the Tailwind theme so they adapt to light/dark mode.
// ============================================================================

/** Base density → fill color (progressively darker for harder bases) */
const BASE_FILLS: Record<string, { fill: string; textFill: string }> = {
  soft:   { fill: 'var(--muted)',            textFill: 'var(--muted-foreground)' },
  medium: { fill: 'var(--border)',            textFill: 'var(--foreground)' },
  hard:   { fill: 'var(--muted-foreground)',  textFill: 'var(--background)' },
};

/**
 * Topper layers use opacity-stepped variants of muted/foreground
 * to communicate soft → hard progression without hardcoded hex.
 */
const TOPPER_FILLS: Record<number, { soft: string; hard: string; softOpacity: number; hardOpacity: number }> = {
  1: { soft: 'var(--muted)', hard: 'var(--muted)',            softOpacity: 1,   hardOpacity: 1 },
  2: { soft: 'var(--muted)', hard: 'var(--border)',           softOpacity: 1,   hardOpacity: 1 },
  3: { soft: 'var(--muted)', hard: 'var(--muted-foreground)', softOpacity: 1,   hardOpacity: 0.4 },
  4: { soft: 'var(--border)', hard: 'var(--muted-foreground)', softOpacity: 1,  hardOpacity: 0.6 },
  5: { soft: 'var(--muted-foreground)', hard: 'var(--muted-foreground)', softOpacity: 0.4, hardOpacity: 0.6 },
  6: { soft: 'var(--muted-foreground)', hard: 'var(--ring)',  softOpacity: 0.6, hardOpacity: 0.7 },
};

/** Cylinder types use chart colors (semantic, theme-aware) */
const CYLINDER_FILLS: Record<string, string> = {
  none:         'transparent',
  super_soft_6: 'var(--chart-2)',
  soft_8:       'var(--chart-2)',
  medium_8:     'var(--chart-1)',
  firm_8:       'var(--chart-3)',
};

const CYLINDER_OPACITIES: Record<string, number> = {
  none: 0,
  super_soft_6: 0.35,
  soft_8: 0.55,
  medium_8: 0.75,
  firm_8: 1,
};

// ============================================================================
// Descriptive labels for a11y
// ============================================================================

const BASE_LABELS: Record<string, string> = {
  soft: 'morbida', medium: 'media', hard: 'rigida',
};

const CYLINDER_LABELS: Record<string, string> = {
  none: 'vuoto', super_soft_6: 'super soft 6cm', soft_8: 'soft 8cm',
  medium_8: 'medium 8cm', firm_8: 'firm 8cm',
};

function buildAriaLabel(config: LeadAnalysisConfig, isOne?: boolean): string {
  const model = config.model.toUpperCase();
  const base = BASE_LABELS[config.base_density] || config.base_density;
  const topper = isOne ? 'fisso' : `livello ${config.topper_level}`;
  let label = `Sezione ${model}: base ${base}, topper ${topper}`;
  if (config.model === 'pro') {
    const sh = CYLINDER_LABELS[config.cylinder_shoulders || 'none'];
    const lu = CYLINDER_LABELS[config.cylinder_lumbar || 'none'];
    const le = CYLINDER_LABELS[config.cylinder_legs || 'none'];
    label += `, cilindri spalle ${sh}, lombare ${lu}, gambe ${le}`;
  }
  return label;
}

// ============================================================================
// Component
// ============================================================================

export function MattressCrossSection({ config, isOne }: MattressCrossSectionProps) {
  const totalHeight = 230;
  const width = 300;
  const baseH = isOne ? 170 : 140;
  const topperH = isOne ? 50 : 80;
  const coverH = 10;

  const baseFill = BASE_FILLS[config.base_density] || BASE_FILLS.medium;
  const topperLevel = config.topper_level || 3;
  const topperFill = TOPPER_FILLS[topperLevel] || TOPPER_FILLS[3];

  const softRatio = isOne ? 0.5 : [1, 0.75, 0.5, 0.25, 0, 0.5][topperLevel - 1];
  const softH = topperH * softRatio;
  const hardH = topperH - softH;

  const isPro = config.model === 'pro';
  const cylinderZoneH = isPro ? 80 : 0;
  const solidBaseH = baseH - cylinderZoneH;

  // Semantic color references
  const strokeColor = 'var(--border)';
  const textMuted = 'var(--muted-foreground)';
  const textSubtle = 'var(--ring)';

  return (
    <svg
      viewBox={`0 0 ${width} ${totalHeight + 20}`}
      className="w-full h-auto max-w-[300px] mx-auto"
      role="img"
      aria-label={buildAriaLabel(config, isOne)}
    >
      {/* Cover top */}
      <rect
        x={10} y={5} width={width - 20} height={coverH} rx={4}
        fill="var(--muted)" stroke={strokeColor} strokeWidth={0.5}
      />
      <text x={width / 2} y={12} textAnchor="middle" fontSize={7} fill={textSubtle}>
        Cover
      </text>

      {/* Topper — soft layer */}
      <rect
        x={10} y={5 + coverH} width={width - 20} height={softH}
        fill={topperFill.soft} fillOpacity={topperFill.softOpacity}
        stroke={strokeColor} strokeWidth={0.5}
      />
      {softH > 15 && (
        <text
          x={width / 2} y={5 + coverH + softH / 2 + 3}
          textAnchor="middle" fontSize={7} fill={textMuted}
        >
          Visco Soft
        </text>
      )}

      {/* Topper — hard layer */}
      <rect
        x={10} y={5 + coverH + softH} width={width - 20} height={hardH}
        fill={topperFill.hard} fillOpacity={topperFill.hardOpacity}
        stroke={strokeColor} strokeWidth={0.5}
      />
      {hardH > 15 && (
        <text
          x={width / 2} y={5 + coverH + softH + hardH / 2 + 3}
          textAnchor="middle" fontSize={7} fill={textMuted}
        >
          {topperLevel === 6 ? 'HR + Hard' : 'Visco Hard'}
        </text>
      )}

      {/* Separator */}
      <line
        x1={10} y1={5 + coverH + topperH}
        x2={width - 10} y2={5 + coverH + topperH}
        stroke={textSubtle} strokeWidth={1} strokeDasharray="4,3"
      />

      {/* Cylinder zone (PRO) */}
      {isPro && (
        <g>
          <rect
            x={10} y={5 + coverH + topperH}
            width={width - 20} height={cylinderZoneH}
            fill={baseFill.fill} fillOpacity={0.3}
            stroke={strokeColor} strokeWidth={0.5}
          />
          {renderCylinders(config, width, 5 + coverH + topperH, cylinderZoneH, strokeColor, textSubtle)}
        </g>
      )}

      {/* Solid base */}
      <rect
        x={10}
        y={5 + coverH + topperH + cylinderZoneH}
        width={width - 20}
        height={solidBaseH}
        fill={baseFill.fill}
        stroke={strokeColor}
        strokeWidth={0.5}
      />
      <text
        x={width / 2}
        y={5 + coverH + topperH + cylinderZoneH + solidBaseH / 2 + 3}
        textAnchor="middle" fontSize={8}
        fill={baseFill.textFill}
      >
        SmartBase™ {config.base_density.charAt(0).toUpperCase() + config.base_density.slice(1)}
      </text>

      {/* Scanalature (ONE & PLUS) */}
      {!isPro && (
        <g opacity={0.25}>
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={i}
              x1={10 + (i + 1) * ((width - 20) / 7)}
              y1={5 + coverH + topperH + 5}
              x2={10 + (i + 1) * ((width - 20) / 7)}
              y2={5 + coverH + topperH + baseH - 20}
              stroke={textSubtle}
              strokeWidth={1.5}
              strokeDasharray="2,4"
            />
          ))}
        </g>
      )}

      {/* Cover bottom */}
      <rect
        x={10} y={5 + coverH + topperH + baseH}
        width={width - 20} height={coverH} rx={4}
        fill="var(--border)" stroke={strokeColor} strokeWidth={0.5}
      />

      {/* Height label */}
      <text
        x={width - 5} y={totalHeight / 2 + 10}
        textAnchor="end" fontSize={8} fill={textSubtle}
        transform={`rotate(-90, ${width - 5}, ${totalHeight / 2 + 10})`}
      >
        23cm
      </text>
    </svg>
  );
}

// ============================================================================
// Cylinder renderer (PRO model)
// ============================================================================

function renderCylinders(
  config: LeadAnalysisConfig,
  svgWidth: number,
  yStart: number,
  zoneH: number,
  strokeColor: string,
  textColor: string,
) {
  const cylinders: Array<{ type: string; zone: string }> = [];

  const sh = config.cylinder_shoulders || 'super_soft_6';
  cylinders.push({ type: sh, zone: 'S' }, { type: sh, zone: 'S' }, { type: sh, zone: 'S' });

  const lu = config.cylinder_lumbar || 'medium_8';
  cylinders.push(
    { type: lu, zone: 'L' }, { type: lu, zone: 'L' },
    { type: lu, zone: 'L' }, { type: lu, zone: 'L' },
  );

  const le = config.cylinder_legs || sh;
  cylinders.push({ type: le, zone: 'G' }, { type: le, zone: 'G' }, { type: le, zone: 'G' });

  const innerW = svgWidth - 20;
  const cylW = innerW / 10;
  const padding = 2;
  const cylR = (cylW - padding * 2) / 2;

  return (
    <>
      {cylinders.map((c, i) => {
        const cx = 10 + i * cylW + cylW / 2;
        const cy = yStart + zoneH / 2;
        const fill = CYLINDER_FILLS[c.type] || CYLINDER_FILLS.medium_8;
        const opacity = CYLINDER_OPACITIES[c.type] ?? 0.75;
        const isNone = c.type === 'none';

        return (
          <g key={i}>
            <circle
              cx={cx}
              cy={cy}
              r={cylR}
              fill={isNone ? 'none' : fill}
              fillOpacity={opacity}
              stroke={isNone ? strokeColor : 'var(--muted-foreground)'}
              strokeWidth={0.5}
              strokeDasharray={isNone ? '2,2' : 'none'}
            />
            <text
              x={cx} y={cy + 3}
              textAnchor="middle" fontSize={6}
              fill={isNone ? textColor : 'var(--foreground)'}
            >
              {c.zone}
            </text>
          </g>
        );
      })}
      {/* Zone labels */}
      <text x={10 + 1.5 * cylW} y={yStart - 3} textAnchor="middle" fontSize={6} fill={textColor}>
        Spalle
      </text>
      <text x={10 + 5 * cylW} y={yStart - 3} textAnchor="middle" fontSize={6} fill={textColor}>
        Lombare
      </text>
      <text x={10 + 8.5 * cylW} y={yStart - 3} textAnchor="middle" fontSize={6} fill={textColor}>
        Gambe
      </text>
    </>
  );
}
