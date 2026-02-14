'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  LeadAnalysisCreateInput,
  BodyShape,
  SleepPosition,
  FirmnessPreference,
  HealthIssue,
} from '@/types/database';

interface AnalysisFormProps {
  onSubmit: (data: Omit<LeadAnalysisCreateInput, 'lead_id'>) => Promise<void>;
  isSubmitting?: boolean;
}

const BODY_SHAPES: { value: BodyShape; label: string; desc: string }[] = [
  { value: 'v_shape', label: 'V-Shape', desc: 'Spalle larghe, fianchi stretti' },
  { value: 'a_shape', label: 'A-Shape', desc: 'Fianchi larghi, spalle strette' },
  { value: 'normal', label: 'Normale', desc: 'Proporzioni equilibrate' },
  { value: 'h_shape', label: 'H-Shape', desc: 'Spalle e fianchi allineati' },
  { value: 'round', label: 'Rotondo', desc: 'Corporatura robusta' },
];

const SLEEP_POSITIONS: { value: SleepPosition; label: string; emoji: string }[] = [
  { value: 'side', label: 'Laterale', emoji: '🛌' },
  { value: 'supine', label: 'Supino', emoji: '🔼' },
  { value: 'prone', label: 'Prono', emoji: '🔽' },
  { value: 'mixed', label: 'Misto', emoji: '🔄' },
];

const FIRMNESS_OPTIONS: { value: FirmnessPreference; label: string }[] = [
  { value: 'soft', label: 'Accogliente' },
  { value: 'neutral', label: 'Neutro' },
  { value: 'firm', label: 'Sostenuto' },
];

const HEALTH_ISSUES: { value: HealthIssue; label: string }[] = [
  { value: 'lower_back_pain', label: 'Dolore lombare' },
  { value: 'shoulder_pain', label: 'Dolore spalle' },
  { value: 'hip_pain', label: 'Dolore anche' },
  { value: 'sciatica', label: 'Sciatica' },
  { value: 'lordosis', label: 'Lordosi' },
  { value: 'kyphosis', label: 'Cifosi' },
  { value: 'fibromyalgia', label: 'Fibromialgia' },
];

export function AnalysisForm({ onSubmit, isSubmitting }: AnalysisFormProps) {
  const [personLabel, setPersonLabel] = useState('Partner 1');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [bodyShape, setBodyShape] = useState<BodyShape>('normal');
  const [sleepPosition, setSleepPosition] = useState<SleepPosition>('side');
  const [firmness, setFirmness] = useState<FirmnessPreference>('neutral');
  const [healthIssues, setHealthIssues] = useState<HealthIssue[]>([]);
  const [circulationIssues, setCirculationIssues] = useState(false);
  const [snoringApnea, setSnoringApnea] = useState(false);
  const [readsWatches, setReadsWatches] = useState(false);

  const toggleHealthIssue = (issue: HealthIssue) => {
    setHealthIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const weight = parseInt(weightKg, 10);
    const height = parseInt(heightCm, 10);

    if (isNaN(weight) || weight < 30 || weight > 250) return;
    if (isNaN(height) || height < 100 || height > 230) return;

    await onSubmit({
      person_label: personLabel,
      sex,
      weight_kg: weight,
      height_cm: height,
      body_shape: bodyShape,
      sleep_position: sleepPosition,
      firmness_preference: firmness,
      health_issues: healthIssues,
      circulation_issues: circulationIssues,
      snoring_apnea: snoringApnea,
      reads_watches_in_bed: readsWatches,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonna sinistra: dati base */}
        <div className="space-y-5">
          {/* Label persona */}
          <div className="space-y-2">
            <Label htmlFor="personLabel">Nome/Etichetta</Label>
            <Input
              id="personLabel"
              value={personLabel}
              onChange={(e) => setPersonLabel(e.target.value)}
              placeholder="Partner 1"
            />
          </div>

          {/* Sesso */}
          <div className="space-y-2">
            <Label>Sesso</Label>
            <div className="flex gap-2">
              {(['male', 'female'] as const).map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={sex === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSex(s)}
                >
                  {s === 'male' ? 'Uomo' : 'Donna'}
                </Button>
              ))}
            </div>
          </div>

          {/* Peso + Altezza */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                min={30}
                max={250}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="75"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Altezza (cm)</Label>
              <Input
                id="height"
                type="number"
                min={100}
                max={230}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="175"
                required
              />
            </div>
          </div>

          {/* Posizione di sonno */}
          <div className="space-y-2">
            <Label>Posizione di sonno</Label>
            <div className="grid grid-cols-2 gap-2">
              {SLEEP_POSITIONS.map((pos) => (
                <Button
                  key={pos.value}
                  type="button"
                  variant={sleepPosition === pos.value ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start"
                  onClick={() => setSleepPosition(pos.value)}
                >
                  <span className="mr-2">{pos.emoji}</span>
                  {pos.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Preferenza rigidità */}
          <div className="space-y-2">
            <Label>Preferenza rigidità</Label>
            <div className="flex gap-2">
              {FIRMNESS_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={firmness === opt.value ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setFirmness(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Colonna destra: body shape + problematiche */}
        <div className="space-y-5">
          {/* Body Shape */}
          <div className="space-y-2">
            <Label>Forma del corpo</Label>
            <div className="grid grid-cols-1 gap-2">
              {BODY_SHAPES.map((shape) => (
                <Card
                  key={shape.value}
                  className={cn(
                    'cursor-pointer transition-colors',
                    bodyShape === shape.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-muted-foreground/30',
                  )}
                  onClick={() => setBodyShape(shape.value)}
                >
                  <CardContent className="flex items-center gap-3 py-3">
                    <div
                      className={cn(
                        'h-3 w-3 rounded-full border-2',
                        bodyShape === shape.value
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/30',
                      )}
                    />
                    <div>
                      <span className="text-sm font-medium">{shape.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{shape.desc}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Problematiche */}
          <div className="space-y-2">
            <Label>Problematiche fisiche</Label>
            <div className="flex flex-wrap gap-2">
              {HEALTH_ISSUES.map((issue) => (
                <Badge
                  key={issue.value}
                  variant={healthIssues.includes(issue.value) ? 'secondary' : 'outline'}
                  className="cursor-pointer text-xs py-1 px-3"
                  onClick={() => toggleHealthIssue(issue.value)}
                >
                  {issue.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Domande accessori */}
          <div className="space-y-3">
            <Label>Condizioni aggiuntive</Label>
            {[
              { id: 'circulation', label: 'Problemi circolatori', checked: circulationIssues, toggle: setCirculationIssues },
              { id: 'snoring', label: 'Russamento / Apnee notturne', checked: snoringApnea, toggle: setSnoringApnea },
              { id: 'reads', label: 'Legge / Guarda TV a letto', checked: readsWatches, toggle: setReadsWatches },
            ].map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => item.toggle(!item.checked)}
                  className="h-4 w-4 rounded border-muted-foreground/30"
                />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting || !weightKg || !heightCm}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generazione in corso...
          </>
        ) : (
          'Genera Configurazione'
        )}
      </Button>
    </form>
  );
}
