'use client';

import type { LeadAnalysisConfig } from '@/types/database';

interface MattressCrossSectionProps {
  config: LeadAnalysisConfig;
  isOne?: boolean;
}

// Color scales
const BASE_COLORS: Record<string, string> = {
  soft: '#d4d4d4',    // light gray
  medium: '#9ca3af',  // medium gray
  hard: '#4b5563',    // dark gray
};

const TOPPER_COLORS: Record<number, { soft: string; hard: string }> = {
  1: { soft: '#e5e7eb', hard: '#e5e7eb' },    // all soft → very light
  2: { soft: '#e5e7eb', hard: '#d1d5db' },
  3: { soft: '#e5e7eb', hard: '#9ca3af' },
  4: { soft: '#d1d5db', hard: '#6b7280' },
  5: { soft: '#9ca3af', hard: '#6b7280' },     // all hard → darker
  6: { soft: '#6b7280', hard: '#a3a3a3' },     // hard + HR
};

const CYLINDER_COLORS: Record<string, string> = {
  none: 'transparent',
  super_soft_6: '#bfdbfe', // light blue
  soft_8: '#93c5fd',       // blue
  medium_8: '#3b82f6',     // medium blue
  firm_8: '#1d4ed8',       // dark blue
};

export function MattressCrossSection({ config, isOne }: MattressCrossSectionProps) {
  const totalHeight = 230; // 23cm scaled to 230
  const width = 300;
  const baseH = isOne ? 170 : 140; // 17cm or 14cm
  const topperH = isOne ? 50 : 80;  // 5cm or 8cm
  const coverH = 10; // cover (visual)

  const baseColor = BASE_COLORS[config.base_density] || BASE_COLORS.medium;
  const topperLevel = config.topper_level || 3;
  const topperColor = TOPPER_COLORS[topperLevel] || TOPPER_COLORS[3];

  // Topper layers (soft on top, hard below)
  const softRatio = isOne ? 0.5 : [1, 0.75, 0.5, 0.25, 0, 0.5][topperLevel - 1];
  const softH = topperH * softRatio;
  const hardH = topperH - softH;

  // PRO: cylinders embedded in top 80 of baseH
  const isPro = config.model === 'pro';
  const cylinderZoneH = isPro ? 80 : 0;
  const solidBaseH = baseH - cylinderZoneH;

  return (
    <svg
      viewBox={`0 0 ${width} ${totalHeight + 20}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Cross-section ${config.model.toUpperCase()}`}
    >
      {/* Cover top */}
      <rect x={10} y={5} width={width - 20} height={coverH} rx={4}
        fill="#e0e7ef" stroke="#c7cdd4" strokeWidth={0.5} />
      <text x={width / 2} y={12} textAnchor="middle" fontSize={7} fill="#64748b">Cover</text>

      {/* Topper — soft layer (top) */}
      <rect x={10} y={5 + coverH} width={width - 20} height={softH} rx={0}
        fill={topperColor.soft} stroke="#b0b8c1" strokeWidth={0.5} />
      {softH > 15 && (
        <text x={width / 2} y={5 + coverH + softH / 2 + 3} textAnchor="middle" fontSize={7} fill="#64748b">
          Visco Soft
        </text>
      )}

      {/* Topper — hard layer (bottom) */}
      <rect x={10} y={5 + coverH + softH} width={width - 20} height={hardH} rx={0}
        fill={topperColor.hard} stroke="#b0b8c1" strokeWidth={0.5} />
      {hardH > 15 && (
        <text x={width / 2} y={5 + coverH + softH + hardH / 2 + 3} textAnchor="middle" fontSize={7} fill="#4a5568">
          {topperLevel === 6 ? 'HR + Hard' : 'Visco Hard'}
        </text>
      )}

      {/* Separator line */}
      <line x1={10} y1={5 + coverH + topperH} x2={width - 10} y2={5 + coverH + topperH}
        stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />

      {/* Base — cylinder zone (PRO only) */}
      {isPro && (
        <g>
          <rect x={10} y={5 + coverH + topperH} width={width - 20} height={cylinderZoneH}
            fill={baseColor} fillOpacity={0.3} stroke="#b0b8c1" strokeWidth={0.5} />

          {/* Cylinders: 3 shoulders + 4 lumbar + 3 legs */}
          {renderCylinders(config, width, 5 + coverH + topperH, cylinderZoneH)}
        </g>
      )}

      {/* Base — solid part (or full for ONE/PLUS) */}
      <rect
        x={10}
        y={5 + coverH + topperH + cylinderZoneH}
        width={width - 20}
        height={solidBaseH}
        rx={isPro ? 0 : 0}
        fill={baseColor}
        stroke="#b0b8c1"
        strokeWidth={0.5}
      />
      <text
        x={width / 2}
        y={5 + coverH + topperH + cylinderZoneH + solidBaseH / 2 + 3}
        textAnchor="middle" fontSize={8} fill={config.base_density === 'hard' ? '#fff' : '#4a5568'}
      >
        SmartBase™ {config.base_density.charAt(0).toUpperCase() + config.base_density.slice(1)}
      </text>

      {/* Scanalature (ONE & PLUS only) */}
      {!isPro && (
        <g opacity={0.3}>
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={i}
              x1={10 + (i + 1) * ((width - 20) / 7)}
              y1={5 + coverH + topperH + 5}
              x2={10 + (i + 1) * ((width - 20) / 7)}
              y2={5 + coverH + topperH + baseH - 20}
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="2,4"
            />
          ))}
        </g>
      )}

      {/* Cover bottom */}
      <rect x={10} y={5 + coverH + topperH + baseH} width={width - 20} height={coverH} rx={4}
        fill="#d1d5db" stroke="#c7cdd4" strokeWidth={0.5} />

      {/* Height label */}
      <text x={width - 5} y={totalHeight / 2 + 10} textAnchor="end" fontSize={8} fill="#94a3b8" transform={`rotate(-90, ${width - 5}, ${totalHeight / 2 + 10})`}>
        23cm
      </text>
    </svg>
  );
}

function renderCylinders(
  config: LeadAnalysisConfig,
  svgWidth: number,
  yStart: number,
  zoneH: number,
) {
  const cylinders: Array<{ type: string; zone: string }> = [];

  // 3 shoulders
  const sh = config.cylinder_shoulders || 'super_soft_6';
  cylinders.push({ type: sh, zone: 'S' }, { type: sh, zone: 'S' }, { type: sh, zone: 'S' });

  // 4 lumbar
  const lu = config.cylinder_lumbar || 'medium_8';
  cylinders.push({ type: lu, zone: 'L' }, { type: lu, zone: 'L' }, { type: lu, zone: 'L' }, { type: lu, zone: 'L' });

  // 3 legs (mirror shoulders)
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
        const color = CYLINDER_COLORS[c.type] || CYLINDER_COLORS.medium_8;
        const isNone = c.type === 'none';

        return (
          <g key={i}>
            <circle
              cx={cx}
              cy={cy}
              r={cylR}
              fill={isNone ? 'none' : color}
              stroke={isNone ? '#cbd5e1' : '#6b7280'}
              strokeWidth={0.5}
              strokeDasharray={isNone ? '2,2' : 'none'}
            />
            <text x={cx} y={cy + 3} textAnchor="middle" fontSize={6} fill={isNone ? '#94a3b8' : '#1e3a5f'}>
              {c.zone}
            </text>
          </g>
        );
      })}
      {/* Zone labels */}
      <text x={10 + 1.5 * cylW} y={yStart - 3} textAnchor="middle" fontSize={6} fill="#94a3b8">Spalle</text>
      <text x={10 + 5 * cylW} y={yStart - 3} textAnchor="middle" fontSize={6} fill="#94a3b8">Lombare</text>
      <text x={10 + 8.5 * cylW} y={yStart - 3} textAnchor="middle" fontSize={6} fill="#94a3b8">Gambe</text>
    </>
  );
}
