'use client';

import { cn } from '@/lib/utils';
import type { BodyShape, HealthIssue } from '@/types/database';

interface BodySilhouetteProps {
  sex: 'male' | 'female';
  bodyShape: BodyShape;
  healthIssues: HealthIssue[];
  onToggleIssue?: (issue: HealthIssue) => void;
  className?: string;
}

// Map health issues to body zones
const ZONE_ISSUES: Record<string, HealthIssue[]> = {
  shoulders: ['shoulder_pain', 'kyphosis'],
  lumbar: ['lower_back_pain', 'lordosis'],
  hips: ['hip_pain'],
};

// Body shape silhouette adjustments (shoulder width, waist width, hip width)
const SHAPE_PARAMS: Record<BodyShape, { sw: number; ww: number; hw: number }> = {
  v_shape: { sw: 52, ww: 32, hw: 30 },
  a_shape: { sw: 34, ww: 34, hw: 50 },
  normal: { sw: 40, ww: 32, hw: 38 },
  h_shape: { sw: 40, ww: 38, hw: 40 },
  round: { sw: 44, ww: 46, hw: 46 },
};

function buildBodyPath(sex: 'male' | 'female', shape: BodyShape): string {
  const p = SHAPE_PARAMS[shape];
  // Scale adjustments for female (slightly narrower shoulders, wider hips)
  const sw = sex === 'female' ? p.sw - 4 : p.sw;
  const hw = sex === 'female' ? p.hw + 4 : p.hw;
  const ww = p.ww;

  // Center at x=100, body from y=40 (neck) to y=280 (legs)
  const cx = 100;
  const neckY = 40;
  const shoulderY = 62;
  const waistY = 140;
  const hipY = 170;
  const kneeY = 230;
  const footY = 280;

  return `
    M ${cx} ${neckY}
    C ${cx - 8} ${neckY} ${cx - sw / 2 - 8} ${shoulderY - 10} ${cx - sw / 2} ${shoulderY}
    L ${cx - sw / 2 + 2} ${shoulderY + 20}
    C ${cx - sw / 2 + 2} ${shoulderY + 20} ${cx - ww / 2} ${waistY - 10} ${cx - ww / 2} ${waistY}
    C ${cx - ww / 2} ${waistY + 10} ${cx - hw / 2} ${hipY - 5} ${cx - hw / 2} ${hipY}
    L ${cx - hw / 2 + 4} ${hipY + 20}
    C ${cx - hw / 2 + 4} ${hipY + 30} ${cx - 14} ${kneeY} ${cx - 14} ${kneeY}
    L ${cx - 12} ${footY}
    L ${cx - 6} ${footY}
    L ${cx - 6} ${kneeY + 10}
    L ${cx} ${hipY + 30}
    L ${cx} ${hipY + 30}
    L ${cx + 6} ${kneeY + 10}
    L ${cx + 6} ${footY}
    L ${cx + 12} ${footY}
    L ${cx + 14} ${kneeY}
    C ${cx + 14} ${kneeY} ${cx + hw / 2 - 4} ${hipY + 30} ${cx + hw / 2 - 4} ${hipY + 20}
    L ${cx + hw / 2} ${hipY}
    C ${cx + hw / 2} ${hipY - 5} ${cx + ww / 2} ${waistY + 10} ${cx + ww / 2} ${waistY}
    C ${cx + ww / 2} ${waistY - 10} ${cx + sw / 2 - 2} ${shoulderY + 20} ${cx + sw / 2 - 2} ${shoulderY + 20}
    L ${cx + sw / 2} ${shoulderY}
    C ${cx + sw / 2 + 8} ${shoulderY - 10} ${cx + 8} ${neckY} ${cx} ${neckY}
    Z
  `;
}

function ZoneOverlay({
  zone,
  active,
  onClick,
}: {
  zone: 'shoulders' | 'lumbar' | 'hips';
  active: boolean;
  onClick?: () => void;
}) {
  // Zone positions on the body
  const zones: Record<string, { cx: number; cy: number; rx: number; ry: number; label: string }> = {
    shoulders: { cx: 100, cy: 68, rx: 36, ry: 14, label: 'Spalle' },
    lumbar: { cx: 100, cy: 135, rx: 24, ry: 18, label: 'Lombare' },
    hips: { cx: 100, cy: 172, rx: 30, ry: 14, label: 'Anche' },
  };

  const z = zones[zone];

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${z.label}${active ? ' — dolore attivo' : ''}`}
      aria-pressed={active}
      className={cn(
        'cursor-pointer outline-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <ellipse
        cx={z.cx}
        cy={z.cy}
        rx={z.rx}
        ry={z.ry}
        className={cn(
          'transition-colors duration-200',
          active
            ? 'fill-destructive/30 stroke-destructive'
            : 'fill-transparent stroke-muted-foreground/20 hover:fill-muted/50 hover:stroke-muted-foreground/40',
        )}
        strokeWidth={active ? 2 : 1}
        strokeDasharray={active ? 'none' : '4 3'}
      />
      <text
        x={z.cx}
        y={z.cy + 4}
        textAnchor="middle"
        className={cn(
          'text-[9px] select-none pointer-events-none',
          active ? 'fill-destructive' : 'fill-muted-foreground/60',
        )}
      >
        {z.label}
      </text>
    </g>
  );
}

export function BodySilhouette({
  sex,
  bodyShape,
  healthIssues,
  onToggleIssue,
  className,
}: BodySilhouetteProps) {
  const bodyPath = buildBodyPath(sex, bodyShape);

  // Check if any issue in a zone is active
  const isZoneActive = (zone: string) =>
    ZONE_ISSUES[zone]?.some((issue) => healthIssues.includes(issue)) ?? false;

  // When a zone is clicked, toggle the primary issue for that zone
  const handleZoneClick = (zone: string) => {
    if (!onToggleIssue) return;
    const primaryIssue: Record<string, HealthIssue> = {
      shoulders: 'shoulder_pain',
      lumbar: 'lower_back_pain',
      hips: 'hip_pain',
    };
    if (primaryIssue[zone]) {
      onToggleIssue(primaryIssue[zone]);
    }
  };

  return (
    <div className={cn('relative', className)} role="img" aria-label="Silhouette corpo con zone dolore">
      <svg viewBox="0 0 200 300" className="w-full h-auto max-h-[320px]">
        {/* Head */}
        <circle cx={100} cy={22} r={16} className="fill-muted stroke-border" strokeWidth={1.5} />

        {/* Body */}
        <path
          d={bodyPath}
          className="fill-muted/60 stroke-foreground/20"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Clickable pain zones */}
        <ZoneOverlay
          zone="shoulders"
          active={isZoneActive('shoulders')}
          onClick={() => handleZoneClick('shoulders')}
        />
        <ZoneOverlay
          zone="lumbar"
          active={isZoneActive('lumbar')}
          onClick={() => handleZoneClick('lumbar')}
        />
        <ZoneOverlay
          zone="hips"
          active={isZoneActive('hips')}
          onClick={() => handleZoneClick('hips')}
        />

        {/* Fibromyalgia full-body indicator */}
        {healthIssues.includes('fibromyalgia') && (
          <rect
            x={60}
            y={50}
            width={80}
            height={220}
            rx={20}
            className="fill-destructive/10 stroke-destructive/30"
            strokeWidth={1}
            strokeDasharray="6 3"
          />
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-destructive/30 ring-1 ring-destructive" />
          <span className="text-xs text-muted-foreground">Dolore attivo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-muted ring-1 ring-muted-foreground/20" />
          <span className="text-xs text-muted-foreground">Click per selezionare</span>
        </div>
      </div>
    </div>
  );
}
