'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MattressCrossSection } from './MattressCrossSection';
import { Bed, Zap } from 'lucide-react';
import type { LeadAnalysis, LeadAnalysisConfig, MattressModel } from '@/types/database';

interface ConfigurationCardsProps {
  leadId: string;
  analysis: LeadAnalysis;
}

const MODEL_LABELS: Record<MattressModel, { name: string; desc: string; badge: string }> = {
  one: { name: 'Modularbed ONE', desc: 'Topper fisso 5cm • Base configurabile', badge: '3 Config' },
  plus: { name: 'Modularbed PLUS', desc: 'Topper 8cm (6 livelli) • Base configurabile', badge: '18 Config' },
  pro: { name: 'Modularbed PRO', desc: 'Topper + Base + TubeLayer System', badge: 'Illimitate' },
};

const BASE_LABELS: Record<string, string> = {
  soft: 'Soft (35-40 kg/m³)',
  medium: 'Medium (40-50 kg/m³)',
  hard: 'Hard (50-60 kg/m³)',
};

const TOPPER_LABELS: Record<number, string> = {
  1: 'L1 — 8cm Soft (ultra morbido)',
  2: 'L2 — 6cm Soft + 2cm Hard',
  3: 'L3 — 4cm Soft + 4cm Hard',
  4: 'L4 — 2cm Soft + 6cm Hard',
  5: 'L5 — 8cm Hard (rigido)',
  6: 'L6 — 4cm Hard + 4cm HR',
};

const CYLINDER_LABELS: Record<string, string> = {
  none: 'Nessuno (cavità vuota)',
  super_soft_6: 'Super Soft 6cm',
  soft_8: 'Soft 8cm',
  medium_8: 'Medium 8cm',
  firm_8: 'Firm 8cm',
};

function ConfigRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-muted/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-primary' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function ConfigCard({ config, isOne }: { config: LeadAnalysisConfig; isOne?: boolean }) {
  const model = MODEL_LABELS[config.model];

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
        {/* Cross-section visuale */}
        <MattressCrossSection config={config} isOne={isOne} />

        {/* Dettagli configurazione */}
        <div className="space-y-0.5">
          <ConfigRow
            label="Base"
            value={BASE_LABELS[config.base_density] || config.base_density}
          />
          <ConfigRow
            label="Topper"
            value={isOne ? 'Fisso (2.5cm Soft + 2.5cm Hard)' : (TOPPER_LABELS[config.topper_level] || `Level ${config.topper_level}`)}
            highlight={!isOne}
          />
          {config.model === 'pro' && (
            <>
              <ConfigRow
                label="Spalle (×3)"
                value={CYLINDER_LABELS[config.cylinder_shoulders || 'none']}
              />
              <ConfigRow
                label="Lombare (×4)"
                value={CYLINDER_LABELS[config.cylinder_lumbar || 'none']}
                highlight
              />
              <ConfigRow
                label="Gambe (×3)"
                value={CYLINDER_LABELS[config.cylinder_legs || 'none']}
              />
            </>
          )}
        </div>

        {/* Override badge */}
        {config.is_manual_override && (
          <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300">
            Modificato manualmente
          </Badge>
        )}

        {/* Scores debug */}
        {config.algorithm_scores?.final_score_topper && (
          <div className="text-[10px] text-muted-foreground/60 space-y-0.5 pt-2 border-t">
            <div>Peso→Topper: {config.algorithm_scores.weight_score_topper} | Mod: {config.algorithm_scores.modifier_total_topper} | Finale: {config.algorithm_scores.final_score_topper}</div>
            <div>Peso→Base: {config.algorithm_scores.weight_score_base} | Mod: {config.algorithm_scores.modifier_total_base} | Finale: {config.algorithm_scores.final_score_base}</div>
            {config.algorithm_scores.guardrail_applied && (
              <Badge variant="outline" className="text-[9px] mt-1">Guardrail attivo</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ConfigurationCards({ leadId, analysis }: ConfigurationCardsProps) {
  const configs = analysis.configs || [];
  const oneConfig = configs.find((c) => c.model === 'one');
  const plusConfig = configs.find((c) => c.model === 'plus');
  const proConfig = configs.find((c) => c.model === 'pro');

  const anyMotorized = configs.some((c) => c.recommend_motorized_base);
  const anyPillow = configs.some((c) => c.recommend_pillow);
  const pillowConfig = configs.find((c) => c.recommend_pillow);

  return (
    <div className="space-y-6">
      {/* 3 Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {oneConfig && <ConfigCard config={oneConfig} isOne />}
        {plusConfig && <ConfigCard config={plusConfig} />}
        {proConfig && <ConfigCard config={proConfig} />}
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
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-4 w-4 text-blue-600" />
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
                <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Bed className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Cuscino AirSense</p>
                  <p className="text-xs text-muted-foreground">
                    {pillowConfig.pillow_height_inserts} inserti •{' '}
                    Lato cervicale: {pillowConfig.pillow_cervical_side === 'pronounced' ? 'curva pronunciata' : 'curva dolce'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
