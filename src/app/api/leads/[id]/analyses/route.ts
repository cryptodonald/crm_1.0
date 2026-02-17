import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  getAnalysesByLeadId,
  createAnalysis,
  insertAnalysisConfigs,
  getAlgorithmSettings,
  getUserByEmail,
} from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import {
  generateConfigurations,
  buildSettingsMap,
  configToDbRow,
} from '@/lib/mattress-configurator';

const uuidSchema = z.string().uuid('Invalid UUID format');

const createAnalysisSchema = z.object({
  person_label: z.string().optional(),
  sex: z.enum(['male', 'female']).optional(),
  weight_kg: z.number().int().min(30).max(250),
  height_cm: z.number().int().min(100).max(230),
  body_shape: z.enum(['v_shape', 'a_shape', 'normal', 'h_shape', 'round']).optional(),
  sleep_position: z.array(z.enum(['side', 'supine', 'prone'])).optional(),
  firmness_preference: z.enum(['soft', 'neutral', 'firm']).optional(),
  health_issues: z.array(z.enum([
    'lordosis', 'kyphosis', 'lower_back_pain',
    'shoulder_pain', 'hip_pain', 'fibromyalgia',
  ])).optional(),
  circulation_issues: z.boolean().optional(),
  snoring_apnea: z.boolean().optional(),
  reads_watches_in_bed: z.boolean().optional(),
  mattress_width_cm: z.number().int().positive().optional(),
  mattress_length_cm: z.number().int().positive().optional(),
});

/**
 * GET /api/leads/[id]/analyses
 * Lista analisi del lead (con configs)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'read');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { id: leadId } = await params;
    const uuidResult = uuidSchema.safeParse(leadId);
    if (!uuidResult.success) {
      return NextResponse.json({ error: 'Lead ID must be a valid UUID' }, { status: 400 });
    }

    const analyses = await getAnalysesByLeadId(leadId);

    return NextResponse.json(
      { analyses },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      },
    );
  } catch (error) {
    console.error('[API Analyses GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/leads/[id]/analyses
 * Crea nuova analisi + genera 3 configurazioni via algoritmo
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { id: leadId } = await params;
    const uuidResult = uuidSchema.safeParse(leadId);
    if (!uuidResult.success) {
      return NextResponse.json({ error: 'Lead ID must be a valid UUID' }, { status: 400 });
    }

    const body = await request.json();
    const validation = createAnalysisSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 },
      );
    }

    // Resolve user
    const user = await getUserByEmail(session.user.email);

    // 1. Create analysis record
    const analysis = await createAnalysis(
      { ...validation.data, lead_id: leadId },
      user?.id,
    );

    // 2. Load algorithm settings from DB
    let settingsMap;
    try {
      const dbSettings = await getAlgorithmSettings();
      settingsMap = buildSettingsMap(dbSettings);
    } catch {
      // Fallback to defaults if table doesn't exist yet
      settingsMap = undefined;
    }

    // 3. Generate configurations
    const configs = generateConfigurations(
      { ...validation.data, lead_id: leadId },
      settingsMap,
    );

    // 4. Insert configs into DB
    const dbConfigs = [
      configToDbRow(configs.one, analysis.id),
      configToDbRow(configs.plus, analysis.id),
      configToDbRow(configs.pro, analysis.id),
    ];
    const savedConfigs = await insertAnalysisConfigs(dbConfigs);

    return NextResponse.json(
      { analysis: { ...analysis, configs: savedConfigs } },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      },
    );
  } catch (error) {
    console.error('[API Analyses POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
