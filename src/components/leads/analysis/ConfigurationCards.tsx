'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { MattressCrossSection } from './MattressCrossSection';
import { Bed, Zap, Pencil, RotateCcw, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useLeadAnalysis } from '@/hooks/use-lead-analyses';
import { toast } from 'sonner';
import type { LeadAnalysis, LeadAnalysisConfig, MattressModel, BaseDensity, CylinderType, LumbarCylinderType } from '@/types/database';

// ============================================================================
// Types & Constants
// ============================================================================

interface ConfigurationCardsProps {
  leadId: string;
  analysis: LeadAnalysis;
}

const MODEL_LABELS: Record<MattressModel, { name: string; desc: string; badge: string }> = {
  one: { name: 'Modularbed ONE', desc: 'Topper fisso 5cm • Base configurabile', badge: '3 Config' },
  plus: { name: 'Modularbed PLUS', desc: 'Topper 8cm (6 livelli) • Base configurabile', badge: '18 Config' },
  pro: { name: 'Modularbed PRO', desc: 'Topper + Base + TubeLayer System', badge: 'Illimitate' },
};

const BASE_OPTIONS: { value: BaseDensity; label: string; tooltip: string }[] = [
  { value: 'soft', label: 'Soft (35-40 kg/m³)', tooltip: 'Base morbida, ideale per pesi leggeri e chi preferisce il comfort avvolgente' },
  { value: 'medium', label: 'Medium (40-50 kg/m³)', tooltip: 'Supporto bilanciato, la scelta più versatile' },
  { value: 'hard', label: 'Hard (50-60 kg/m³)', tooltip: 'Base rigida, supporto massimo per pesi elevati o chi preferisce fermezza' },
];

const TOPPER_OPTIONS: { value: number; label: string; tooltip: string }[] = [
  { value: 1, label: 'L1 — 8cm Soft', tooltip: 'Ultra morbido, tutto memory foam soft' },
  { value: 2, label: 'L2 — 6cm Soft + 2cm Hard', tooltip: 'Prevalentemente morbido con base di sostegno' },
  { value: 3, label: 'L3 — 4cm Soft + 4cm Hard', tooltip: 'Bilanciato, metà comfort e metà sostegno' },
  { value: 4, label: 'L4 — 2cm Soft + 6cm Hard', tooltip: 'Prevalentemente rigido con strato comfort' },
  { value: 5, label: 'L5 — 8cm Hard', tooltip: 'Rigido, tutto memory foam firm' },
  { value: 6, label: 'L6 — 4cm Hard + 4cm HR', tooltip: 'Rigido con alta resilienza, massimo supporto posturale' },
];

const CYLINDER_OPTIONS: { value: CylinderType; label: string }[] = [
  { value: 'none', label: 'Nessuno' },
  { value: 'super_soft_6', label: 'Super Soft 6cm' },
  { value: 'soft_8', label: 'Soft 8cm' },
  { value: 'medium_8', label: 'Medium 8cm' },
  { value: 'firm_8', label: 'Firm 8cm' },
];

const LUMBAR_CYLINDER_OPTIONS: { value: LumbarCylinderType | 'none'; label: string }[] = [
  { value: 'none', label: 'Nessuno' },
  { value: 'soft_8', label: 'Soft 8cm' },
  { value: 'medium_8', label: 'Medium 8cm' },
  { value: 'firm_8', label: 'Firm 8cm' },
];

// ============================================================================
// Editable Config Row
// ============================================================================

interface EditableConfigRowProps {
  label: string;
  value: string;
  tooltip?: string;
  highlight?: boolean;
  isEditing: boolean;
  isOverridden: boolean;
  onEdit: () => void;
  onRestore?: () => void;
  children?: React.ReactNode; // Select for editing
}

function EditableConfigRow({
  label,
  value,
  tooltip,
  highlight,
  isEditing,
  isOverridden,
  onEdit,
  onRestore,
  children,
}: EditableConfigRowProps) {
  return (
    <div className="py-2 border-b border-muted/50 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs text-muted-foreground">{label}</span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3 text-muted-foreground/60 shrink-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
          {isOverridden && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-600 border-amber-300 shrink-0">
              modificato
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isEditing && (
            <>
              <span className={`text-xs font-medium ${highlight ? 'text-primary' : ''}`}>
                {value}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                aria-label={`Modifica ${label}`}
                onClick={onEdit}
              >
                <Pencil className="size-3" />
              </Button>
            </>
          )}
          {isOverridden && onRestore && !isEditing && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={`Ripristina ${label} al valore suggerito`}
                  onClick={onRestore}
                >
                  <RotateCcw className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Ripristina suggerimento algoritmo
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      {isEditing && children}
    </div>
  );
}

// ============================================================================
// Static Config Row (no editing)
// ============================================================================

function ConfigRow({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-muted/50 last:border-0">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3 text-muted-foreground/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

// ============================================================================
// Config Card
// ============================================================================

interface ConfigCardProps {
  config: LeadAnalysisConfig;
  isOne?: boolean;
  onUpdateField: (
    configId: string,
    field: string,
    value: string | number | null,
  ) => Promise<void>;
  onRestoreField: (
    configId: string,
    field: string,
  ) => Promise<void>;
}

function ConfigCard({ config, isOne, onUpdateField, onRestoreField }: ConfigCardProps) {
  const model = MODEL_LABELS[config.model];
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showScores, setShowScores] = useState(false);

  const handleSelect = async (field: string, value: string | number | null) => {
    await onUpdateField(config.id, field, value);
    setEditingField(null);
  };

  const handleRestore = async (field: string) => {
    await onRestoreField(config.id, field);
  };

  const baseLabel = BASE_OPTIONS.find((o) => o.value === config.base_density)?.label || config.base_density;
  const baseTooltip = BASE_OPTIONS.find((o) => o.value === config.base_density)?.tooltip;
  const topperLabel = TOPPER_OPTIONS.find((o) => o.value === config.topper_level)?.label || `Level ${config.topper_level}`;
  const topperTooltip = TOPPER_OPTIONS.find((o) => o.value === config.topper_level)?.tooltip;

  return (
    <Card className="flex-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{model.name}</CardTitle>
          <Badge variant="secondary" className="text-[10px]">{model.badge}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{model.desc}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cross-section */}
        <MattressCrossSection config={config} isOne={isOne} />

        {/* Configuration fields */}
        <div className="space-y-0">
          {/* Base Density — editable */}
          <EditableConfigRow
            label="Base"
            value={baseLabel}
            tooltip={baseTooltip}
            isEditing={editingField === 'base_density'}
            isOverridden={config.is_manual_override}
            onEdit={() => setEditingField('base_density')}
            onRestore={config.is_manual_override ? () => handleRestore('base_density') : undefined}
          >
            <Select
              defaultValue={config.base_density}
              onValueChange={(v) => handleSelect('base_density', v)}
            >
              <SelectTrigger className="mt-1.5 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BASE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </EditableConfigRow>

          {/* Topper Level — editable (non per ONE) */}
          {isOne ? (
            <ConfigRow
              label="Topper"
              value="Fisso (2.5cm Soft + 2.5cm Hard)"
              tooltip="Il modello ONE ha un topper fisso non configurabile"
            />
          ) : (
            <EditableConfigRow
              label="Topper"
              value={topperLabel}
              tooltip={topperTooltip}
              highlight
              isEditing={editingField === 'topper_level'}
              isOverridden={config.is_manual_override}
              onEdit={() => setEditingField('topper_level')}
              onRestore={config.is_manual_override ? () => handleRestore('topper_level') : undefined}
            >
              <Select
                defaultValue={String(config.topper_level)}
                onValueChange={(v) => handleSelect('topper_level', parseInt(v, 10))}
              >
                <SelectTrigger className="mt-1.5 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOPPER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </EditableConfigRow>
          )}

          {/* Cylinders — only for PRO */}
          {config.model === 'pro' && (
            <>
              <EditableConfigRow
                label="Spalle (×3)"
                value={CYLINDER_OPTIONS.find((o) => o.value === (config.cylinder_shoulders || 'none'))?.label || 'Nessuno'}
                tooltip="Cilindri nella zona spalle: alleviano tensione e migliorano avvolgimento laterale"
                isEditing={editingField === 'cylinder_shoulders'}
                isOverridden={config.is_manual_override}
                onEdit={() => setEditingField('cylinder_shoulders')}
                onRestore={config.is_manual_override ? () => handleRestore('cylinder_shoulders') : undefined}
              >
                <Select
                  defaultValue={config.cylinder_shoulders || 'none'}
                  onValueChange={(v) => handleSelect('cylinder_shoulders', v === 'none' ? null : v)}
                >
                  <SelectTrigger className="mt-1.5 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CYLINDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </EditableConfigRow>

              <EditableConfigRow
                label="Lombare (×4)"
                value={LUMBAR_CYLINDER_OPTIONS.find((o) => o.value === (config.cylinder_lumbar || 'none'))?.label || 'Nessuno'}
                tooltip="Cilindri nella zona lombare: sostegno critico per la curva lordotica"
                highlight
                isEditing={editingField === 'cylinder_lumbar'}
                isOverridden={config.is_manual_override}
                onEdit={() => setEditingField('cylinder_lumbar')}
                onRestore={config.is_manual_override ? () => handleRestore('cylinder_lumbar') : undefined}
              >
                <Select
                  defaultValue={config.cylinder_lumbar || 'none'}
                  onValueChange={(v) => handleSelect('cylinder_lumbar', v === 'none' ? null : v)}
                >
                  <SelectTrigger className="mt-1.5 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LUMBAR_CYLINDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </EditableConfigRow>

              <EditableConfigRow
                label="Gambe (×3)"
                value={CYLINDER_OPTIONS.find((o) => o.value === (config.cylinder_legs || 'none'))?.label || 'Nessuno'}
                tooltip="Cilindri nella zona gambe: supporto circolatorio e decompressione"
                isEditing={editingField === 'cylinder_legs'}
                isOverridden={config.is_manual_override}
                onEdit={() => setEditingField('cylinder_legs')}
                onRestore={config.is_manual_override ? () => handleRestore('cylinder_legs') : undefined}
              >
                <Select
                  defaultValue={config.cylinder_legs || 'none'}
                  onValueChange={(v) => handleSelect('cylinder_legs', v === 'none' ? null : v)}
                >
                  <SelectTrigger className="mt-1.5 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CYLINDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </EditableConfigRow>
            </>
          )}
        </div>

        {/* Override badge */}
        {config.is_manual_override && (
          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
            Configurazione modificata manualmente
          </Badge>
        )}

        {/* Algorithm Scores — collapsible debug */}
        {config.algorithm_scores?.final_score_topper != null && (
          <>
            <Separator />
            <button
              type="button"
              className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors w-full"
              onClick={() => setShowScores((s) => !s)}
              aria-expanded={showScores}
            >
              {showScores ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              Punteggi algoritmo
            </button>
            {showScores && (
              <div className="text-[10px] text-muted-foreground/60 space-y-0.5 animate-in fade-in-0 slide-in-from-top-1">
                <div>
                  Peso→Topper: {config.algorithm_scores.weight_score_topper} | Mod:{' '}
                  {config.algorithm_scores.modifier_total_topper} | Finale:{' '}
                  {config.algorithm_scores.final_score_topper}
                </div>
                <div>
                  Peso→Base: {config.algorithm_scores.weight_score_base} | Mod:{' '}
                  {config.algorithm_scores.modifier_total_base} | Finale:{' '}
                  {config.algorithm_scores.final_score_base}
                </div>
                {config.algorithm_scores.guardrail_applied && (
                  <Badge variant="outline" className="text-[9px] mt-1">Guardrail attivo</Badge>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ConfigurationCards({ leadId, analysis }: ConfigurationCardsProps) {
  const { updateConfig } = useLeadAnalysis(leadId, analysis.id);
  const configs = analysis.configs || [];
  const oneConfig = configs.find((c) => c.model === 'one');
  const plusConfig = configs.find((c) => c.model === 'plus');
  const proConfig = configs.find((c) => c.model === 'pro');

  const anyMotorized = configs.some((c) => c.recommend_motorized_base);
  const anyPillow = configs.some((c) => c.recommend_pillow);
  const pillowConfig = configs.find((c) => c.recommend_pillow);

  const handleUpdateField = useCallback(
    async (configId: string, field: string, value: string | number | null) => {
      try {
        await updateConfig(configId, { [field]: value });
        toast.success('Configurazione aggiornata');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Errore aggiornamento');
      }
    },
    [updateConfig],
  );

  const handleRestoreField = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (_configId: string, _field: string) => {
      // TODO: Implement restore via re-run algorithm for single config
      toast.info(`Ripristino automatico non ancora disponibile. Ricalcola l'analisi per ripristinare.`);
    },
    [],
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {/* 3 Configuration Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {oneConfig && (
            <ConfigCard
              config={oneConfig}
              isOne
              onUpdateField={handleUpdateField}
              onRestoreField={handleRestoreField}
            />
          )}
          {plusConfig && (
            <ConfigCard
              config={plusConfig}
              onUpdateField={handleUpdateField}
              onRestoreField={handleRestoreField}
            />
          )}
          {proConfig && (
            <ConfigCard
              config={proConfig}
              onUpdateField={handleUpdateField}
              onRestoreField={handleRestoreField}
            />
          )}
        </div>

        {/* Accessori consigliati */}
        {(anyMotorized || anyPillow) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Accessori Consigliati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {anyMotorized && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Zap className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Rete Motorizzata</p>
                    <p className="text-xs text-muted-foreground">
                      Consigliata in base alle problematiche rilevate
                    </p>
                  </div>
                </div>
              )}
              {anyPillow && pillowConfig && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <Bed className="size-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Cuscino AirSense</p>
                    <p className="text-xs text-muted-foreground">
                      {pillowConfig.pillow_height_inserts} inserti •{' '}
                      Lato cervicale:{' '}
                      {pillowConfig.pillow_cervical_side === 'pronounced'
                        ? 'curva pronunciata'
                        : 'curva dolce'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
