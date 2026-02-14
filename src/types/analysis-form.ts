import { z } from 'zod';

// ============================================================================
// Analysis Form Schema — React Hook Form + Zod 4
// ============================================================================

export const analysisFormSchema = z.object({
  person_label: z
    .string()
    .min(1, 'Il nome è obbligatorio')
    .max(100, 'Massimo 100 caratteri'),

  sex: z.enum(['male', 'female'], {
    error: 'Seleziona il sesso',
  }),

  weight_kg: z
    .number({ error: 'Il peso è obbligatorio' })
    .int('Il peso deve essere un numero intero')
    .min(30, 'Minimo 30 kg')
    .max(250, 'Massimo 250 kg'),

  height_cm: z
    .number({ error: "L'altezza è obbligatoria" })
    .int("L'altezza deve essere un numero intero")
    .min(100, 'Minimo 100 cm')
    .max(230, 'Massimo 230 cm'),

  body_shape: z.enum(['v_shape', 'a_shape', 'normal', 'h_shape', 'round'], {
    error: 'Seleziona la forma del corpo',
  }),

  sleep_position: z.enum(['side', 'supine', 'prone', 'mixed'], {
    error: 'Seleziona la posizione di sonno',
  }),

  firmness_preference: z.enum(['soft', 'neutral', 'firm']).default('neutral'),

  health_issues: z
    .array(
      z.enum([
        'lordosis',
        'kyphosis',
        'lower_back_pain',
        'shoulder_pain',
        'hip_pain',
        'sciatica',
        'fibromyalgia',
      ]),
    )
    .default([]),

  circulation_issues: z.boolean().default(false),
  snoring_apnea: z.boolean().default(false),
  reads_watches_in_bed: z.boolean().default(false),

  mattress_width_cm: z
    .number()
    .int()
    .min(60, 'Minimo 60 cm')
    .max(200, 'Massimo 200 cm')
    .optional(),

  mattress_length_cm: z
    .number()
    .int()
    .min(160, 'Minimo 160 cm')
    .max(220, 'Massimo 220 cm')
    .optional(),
});

export type AnalysisFormData = z.infer<typeof analysisFormSchema>;
