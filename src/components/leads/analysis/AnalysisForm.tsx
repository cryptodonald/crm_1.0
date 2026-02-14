'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
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
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  User,
  Ruler,
  Weight,
  Moon,
  ArrowUpDown,
  Heart,
  BedDouble,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BodySilhouette } from './BodySilhouette';
import { analysisFormSchema, type AnalysisFormData } from '@/types/analysis-form';
import type { HealthIssue, SleepPosition, LeadAnalysisCreateInput } from '@/types/database';

// ============================================================================
// Constants
// ============================================================================

const BODY_SHAPES = [
  { value: 'v_shape' as const, label: 'V-Shape', desc: 'Spalle larghe, fianchi stretti' },
  { value: 'a_shape' as const, label: 'A-Shape', desc: 'Fianchi larghi, spalle strette' },
  { value: 'normal' as const, label: 'Normale', desc: 'Proporzioni equilibrate' },
  { value: 'h_shape' as const, label: 'H-Shape', desc: 'Spalle e fianchi allineati' },
  { value: 'round' as const, label: 'Rotondo', desc: 'Corporatura robusta' },
];

const SLEEP_POSITIONS = [
  { value: 'side' as const, label: 'Laterale', icon: Moon, desc: 'Sul fianco' },
  { value: 'supine' as const, label: 'Supino', icon: ArrowUpDown, desc: 'Sulla schiena' },
  { value: 'prone' as const, label: 'Prono', icon: ArrowUpDown, desc: 'A pancia in giù' },
];

const FIRMNESS_OPTIONS = [
  { value: 'soft' as const, label: 'Accogliente' },
  { value: 'neutral' as const, label: 'Neutro' },
  { value: 'firm' as const, label: 'Sostenuto' },
];

const HEALTH_ISSUES = [
  { value: 'lower_back_pain' as const, label: 'Dolore lombare' },
  { value: 'shoulder_pain' as const, label: 'Dolore spalle' },
  { value: 'hip_pain' as const, label: 'Dolore anche' },
  { value: 'sciatica' as const, label: 'Sciatica' },
  { value: 'lordosis' as const, label: 'Lordosi' },
  { value: 'kyphosis' as const, label: 'Cifosi' },
  { value: 'fibromyalgia' as const, label: 'Fibromialgia' },
];

const ACCESSORY_CONDITIONS = [
  {
    id: 'circulation_issues' as const,
    label: 'Problemi circolatori',
    desc: 'Gambe gonfie, formicolio',
  },
  {
    id: 'snoring_apnea' as const,
    label: 'Russamento / Apnee notturne',
    desc: 'OSAS o russamento abituale',
  },
  {
    id: 'reads_watches_in_bed' as const,
    label: 'Legge / Guarda TV a letto',
    desc: 'Posizione semi-seduta frequente',
  },
];

// ============================================================================
// Props
// ============================================================================

interface AnalysisFormProps {
  onSubmit: (data: Omit<LeadAnalysisCreateInput, 'lead_id'>) => Promise<void>;
  isSubmitting?: boolean;
  defaultValues?: Partial<AnalysisFormData>;
}

// ============================================================================
// Component
// ============================================================================

export function AnalysisForm({ onSubmit, isSubmitting, defaultValues }: AnalysisFormProps) {
  const form = useForm<AnalysisFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(analysisFormSchema) as any,
    defaultValues: {
      person_label: 'Partner 1',
      sex: 'male',
      body_shape: 'normal',
      sleep_position: ['side'],
      firmness_preference: 'neutral',
      health_issues: [],
      circulation_issues: false,
      snoring_apnea: false,
      reads_watches_in_bed: false,
      ...defaultValues,
    } as AnalysisFormData,
    mode: 'onBlur',
  });

  const watchSex = form.watch('sex');
  const watchBodyShape = form.watch('body_shape');
  const watchHealthIssues = form.watch('health_issues');
  const watchSleepPositions = form.watch('sleep_position');

  const handleFormSubmit = async (data: AnalysisFormData) => {
    await onSubmit({
      person_label: data.person_label,
      sex: data.sex,
      weight_kg: data.weight_kg,
      height_cm: data.height_cm,
      body_shape: data.body_shape,
      sleep_position: data.sleep_position,
      firmness_preference: data.firmness_preference,
      health_issues: data.health_issues,
      circulation_issues: data.circulation_issues,
      snoring_apnea: data.snoring_apnea,
      reads_watches_in_bed: data.reads_watches_in_bed,
      mattress_width_cm:
        typeof data.mattress_width_cm === 'number' ? data.mattress_width_cm : undefined,
      mattress_length_cm:
        typeof data.mattress_length_cm === 'number' ? data.mattress_length_cm : undefined,
    });
  };

  const handleToggleHealthIssue = (issue: HealthIssue) => {
    const current = form.getValues('health_issues');
    const next = current.includes(issue)
      ? current.filter((i) => i !== issue)
      : [...current, issue];
    form.setValue('health_issues', next, { shouldValidate: false });
  };

  const handleToggleSleepPosition = (pos: SleepPosition) => {
    const current = form.getValues('sleep_position');
    const next = current.includes(pos)
      ? current.filter((p) => p !== pos)
      : [...current, pos];
    // Almeno una posizione deve essere selezionata
    if (next.length > 0) {
      form.setValue('sleep_position', next, { shouldValidate: false });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-6"
        aria-label="Form anamnesi materasso"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* ============================================================ */}
          {/* LEFT COLUMN: Form fields */}
          {/* ============================================================ */}
          <div className="space-y-6">
            {/* --- Persona --- */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <User className="size-4 text-muted-foreground" />
                  Dati Personali
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nome / Etichetta */}
                  <FormField
                    control={form.control}
                    name="person_label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome / Etichetta</FormLabel>
                        <FormControl>
                          <Input placeholder="Partner 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Sesso */}
                  <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sesso</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleziona" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Uomo</SelectItem>
                            <SelectItem value="female">Donna</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Peso + Altezza */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="weight_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Weight className="size-3.5 text-muted-foreground" />
                          Peso (kg)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={30}
                            max={250}
                            placeholder="75"
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v === '' ? undefined : Number(v));
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="height_cm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Ruler className="size-3.5 text-muted-foreground" />
                          Altezza (cm)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={100}
                            max={230}
                            placeholder="175"
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v === '' ? undefined : Number(v));
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* --- Sonno & Preferenze --- */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Moon className="size-4 text-muted-foreground" />
                  Sonno & Preferenze
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Body Shape */}
                <FormField
                  control={form.control}
                  name="body_shape"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma del corpo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleziona forma" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BODY_SHAPES.map((shape) => (
                            <SelectItem key={shape.value} value={shape.value}>
                              <span className="font-medium">{shape.label}</span>
                              <span className="text-muted-foreground ml-2 text-xs">
                                {shape.desc}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sleep Position (multi-select) */}
                <FormField
                  control={form.control}
                  name="sleep_position"
                  render={() => (
                    <FormItem>
                      <FormLabel>Posizione di sonno</FormLabel>
                      <FormDescription>
                        Seleziona una o più posizioni abituali.
                      </FormDescription>
                      <div className="grid grid-cols-3 gap-2">
                        {SLEEP_POSITIONS.map((pos) => {
                          const Icon = pos.icon;
                          const isSelected = watchSleepPositions?.includes(pos.value);
                          return (
                            <button
                              key={pos.value}
                              type="button"
                              role="checkbox"
                              aria-checked={isSelected}
                              onClick={() => handleToggleSleepPosition(pos.value)}
                              className={cn(
                                'flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium',
                                'transition-colors duration-150 cursor-pointer',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                'min-h-[44px]',
                                isSelected
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-input hover:bg-accent hover:text-accent-foreground',
                              )}
                            >
                              <Icon className="size-4 shrink-0" />
                              <div className="text-left">
                                <div className="leading-tight">{pos.label}</div>
                                <div className="text-xs font-normal text-muted-foreground">
                                  {pos.desc}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Firmness */}
                <FormField
                  control={form.control}
                  name="firmness_preference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Preferenza rigidità
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="size-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Come percepisce il comfort del materasso attuale
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <div className="flex gap-2">
                        {FIRMNESS_OPTIONS.map((opt) => {
                          const isSelected = field.value === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => field.onChange(opt.value)}
                              className={cn(
                                'flex-1 rounded-md border px-3 py-2.5 text-sm font-medium text-center',
                                'transition-colors duration-150 cursor-pointer',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                'min-h-[44px]',
                                isSelected
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-input hover:bg-accent hover:text-accent-foreground',
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* --- Problematiche --- */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Heart className="size-4 text-muted-foreground" />
                  Problematiche & Condizioni
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Health Issues */}
                <FormField
                  control={form.control}
                  name="health_issues"
                  render={() => (
                    <FormItem>
                      <FormLabel>Problematiche fisiche</FormLabel>
                      <FormDescription>
                        Seleziona le problematiche rilevanti. Puoi anche cliccare sulla silhouette.
                      </FormDescription>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {HEALTH_ISSUES.map((issue) => {
                          const isActive = watchHealthIssues?.includes(issue.value);
                          return (
                            <Badge
                              key={issue.value}
                              variant={isActive ? 'primary' : 'outline'}
                              className={cn(
                                'cursor-pointer text-xs py-1.5 px-3 min-h-[32px]',
                                'transition-colors duration-150',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              )}
                              tabIndex={0}
                              role="checkbox"
                              aria-checked={isActive}
                              onClick={() => handleToggleHealthIssue(issue.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleToggleHealthIssue(issue.value);
                                }
                              }}
                            >
                              {issue.label}
                            </Badge>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Accessory conditions */}
                <div className="space-y-3">
                  <FormLabel>Condizioni aggiuntive</FormLabel>
                  {ACCESSORY_CONDITIONS.map((condition) => (
                    <FormField
                      key={condition.id}
                      control={form.control}
                      name={condition.id}
                      render={({ field }) => (
                        <FormItem className="flex items-start gap-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              aria-label={condition.label}
                            />
                          </FormControl>
                          <div className="space-y-0.5 leading-none">
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {condition.label}
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">{condition.desc}</p>
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                <Separator />

                {/* Mattress dimensions */}
                <div>
                  <FormLabel className="flex items-center gap-1.5 mb-3">
                    <BedDouble className="size-3.5 text-muted-foreground" />
                    Misure materasso (opzionale)
                  </FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mattress_width_cm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">
                            Larghezza (cm)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={60}
                              max={200}
                              placeholder="80"
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                field.onChange(v === '' ? undefined : Number(v));
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mattress_length_cm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">
                            Lunghezza (cm)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={160}
                              max={220}
                              placeholder="200"
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                field.onChange(v === '' ? undefined : Number(v));
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN: Body Silhouette */}
          {/* ============================================================ */}
          <div className="hidden lg:block">
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-center">Silhouette</CardTitle>
              </CardHeader>
              <CardContent>
                <BodySilhouette
                  sex={watchSex || 'male'}
                  bodyShape={watchBodyShape || 'normal'}
                  healthIssues={watchHealthIssues || []}
                  onToggleIssue={handleToggleHealthIssue}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[48px]"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Generazione in corso...
            </>
          ) : (
            'Genera Configurazione'
          )}
        </Button>
      </form>
    </Form>
  );
}
