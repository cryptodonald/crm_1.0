'use client';

import { useState, useCallback, useMemo } from 'react';
import { Loader2, Eye, EyeOff, BedDouble, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { BodyModelViewer } from './BodyModelViewer';
import { PointCloudOverlay } from './PointCloudOverlay';
import { BodyZoneEditor } from './BodyZoneEditor';
import { useBodyModel, usePointCloud } from '@/hooks/use-body-model';

import {
  DEFAULT_ZONE_OVERRIDES,
  type BodyModelParams,
  type BodyGender,
  type BodyType,
  type BodyPose,
  type ZoneOverrides,
} from '@/types/body-model';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BodyModelPanelProps {
  /** Pre-fill from lead analysis data */
  initialParams?: Partial<BodyModelParams>;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BodyModelPanel({
  initialParams,
  className,
}: BodyModelPanelProps) {
  // State
  const [gender, setGender] = useState<BodyGender>(
    initialParams?.gender ?? 'male',
  );
  const [heightCm, setHeightCm] = useState(initialParams?.height_cm ?? 175);
  const [weightKg, setWeightKg] = useState(initialParams?.weight_kg ?? 75);
  const [bodyType, setBodyType] = useState<BodyType>(
    initialParams?.body_type ?? 'average',
  );
  const [pose, setPose] = useState<BodyPose>(initialParams?.pose ?? 'standing');
  const [ageYears, setAgeYears] = useState(initialParams?.age_years ?? 40);
  const [zoneOverrides, setZoneOverrides] = useState<ZoneOverrides>(
    initialParams?.zone_overrides ?? { ...DEFAULT_ZONE_OVERRIDES },
  );

  // Toggles
  const [showMesh, setShowMesh] = useState(true);
  const [showPointCloud, setShowPointCloud] = useState(false);

  // Build params
  const params: BodyModelParams = useMemo(
    () => ({
      height_cm: heightCm,
      weight_kg: weightKg,
      gender,
      body_type: bodyType,
      pose,
      age_years: ageYears,
      zone_overrides: zoneOverrides,
    }),
    [heightCm, weightKg, gender, bodyType, pose, ageYears, zoneOverrides],
  );

  // Fetch data
  const { glbUrl, isLoading: meshLoading } = useBodyModel(params);
  const { pointCloud, isLoading: pcLoading } = usePointCloud(params);

  const isLoading = meshLoading || pcLoading;

  const handleZoneChange = useCallback((overrides: ZoneOverrides) => {
    setZoneOverrides(overrides);
  }, []);

  return (
    <div className={cn('flex flex-col lg:flex-row gap-4', className)}>
      {/* ─── 3D Viewer ────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-[400px] lg:min-h-[600px] rounded-lg overflow-hidden border border-border/30">
        <BodyModelViewer glbUrl={glbUrl} showMesh={showMesh}>
          {pointCloud && showPointCloud && (
            <PointCloudOverlay pointCloud={pointCloud} />
          )}
        </BodyModelViewer>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="flex items-center gap-2 text-blue-400">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Generazione modello...</span>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowMesh((v) => !v)}
            className="h-7 gap-1.5 text-xs bg-black/50 hover:bg-black/70 border-0"
          >
            {showMesh ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            Mesh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPointCloud((v) => !v)}
            className="h-7 gap-1.5 text-xs bg-black/50 hover:bg-black/70 border-0"
          >
            {showPointCloud ? (
              <Eye className="size-3" />
            ) : (
              <EyeOff className="size-3" />
            )}
            Point Cloud
          </Button>
        </div>

        {/* Pose selector */}
        <div className="absolute top-3 right-3 flex gap-1.5">
          {(['standing', 'supine', 'prone', 'lateral', 'hybrid'] as const).map((p) => (
            <Button
              key={p}
              variant="secondary"
              size="sm"
              onClick={() => setPose(p)}
              className={cn(
                "h-7 px-2 text-[10px] bg-black/50 hover:bg-black/70 border-0",
                pose === p && "bg-blue-600/70 hover:bg-blue-600/80"
              )}
            >
              {p === 'standing' && 'Piedi'}
              {p === 'supine' && 'Supino'}
              {p === 'prone' && 'Prono'}
              {p === 'lateral' && 'Laterale'}
              {p === 'hybrid' && 'Ibrido'}
            </Button>
          ))}
        </div>

        {/* Stats badge */}
        {pointCloud && (
          <div className="absolute bottom-3 left-3">
            <Badge
              variant="secondary"
              className="bg-black/50 border-0 text-[10px] text-blue-300"
            >
              {pointCloud.metadata.num_points.toLocaleString()} punti •{' '}
              {pointCloud.generation_time_s}s
            </Badge>
          </div>
        )}
      </div>

      {/* ─── Controls Panel ───────────────────────────────────── */}
      <div className="w-full lg:w-72 space-y-4">
        {/* Body params */}
        <div className="rounded-lg border border-border/30 p-4 space-y-3">
          <h3 className="text-sm font-medium">Parametri Corpo</h3>

          {/* Gender */}
          <div className="flex gap-2">
            <Button
              variant={gender === 'male' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGender('male')}
              className="flex-1 h-8 text-xs"
            >
              Uomo
            </Button>
            <Button
              variant={gender === 'female' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGender('female')}
              className="flex-1 h-8 text-xs"
            >
              Donna
            </Button>
          </div>

          {/* Height */}
          <div>
            <label className="text-xs text-muted-foreground">
              Altezza: {heightCm} cm
            </label>
            <input
              type="range"
              min={140}
              max={210}
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="text-xs text-muted-foreground">
              Peso: {weightKg} kg
            </label>
            <input
              type="range"
              min={40}
              max={180}
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Body type */}
          <div className="grid grid-cols-2 gap-1.5">
            {(['slim', 'average', 'athletic', 'heavy'] as const).map((bt) => (
              <Button
                key={bt}
                variant={bodyType === bt ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBodyType(bt)}
                className="h-7 text-[11px]"
              >
                {bt === 'slim'
                  ? 'Snello'
                  : bt === 'average'
                    ? 'Medio'
                    : bt === 'athletic'
                      ? 'Atletico'
                      : 'Robusto'}
              </Button>
            ))}
          </div>

          {/* Age */}
          <div>
            <label className="text-xs text-muted-foreground">
              Età: {ageYears} anni
            </label>
            <input
              type="range"
              min={20}
              max={80}
              value={ageYears}
              onChange={(e) => setAgeYears(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
        </div>

        {/* Zone editor */}
        <div className="rounded-lg border border-border/30 p-4">
          <BodyZoneEditor
            zoneOverrides={zoneOverrides}
            onChange={handleZoneChange}
          />
        </div>

        {/* Zone stats (from point cloud) */}
        {pointCloud && (
          <div className="rounded-lg border border-border/30 p-4 space-y-2">
            <h3 className="text-sm font-medium">Distribuzione Massa</h3>
            {Object.entries(pointCloud.metadata.zone_stats).map(
              ([zone, stats]) => (
                <div
                  key={zone}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground capitalize">
                    {zone.replace(/_/g, ' ')}
                  </span>
                  <span className="text-blue-400 font-mono tabular-nums">
                    {stats.mass_kg} kg
                  </span>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
