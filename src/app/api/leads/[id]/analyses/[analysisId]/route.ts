import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  getAnalysisById,
  updateAnalysis,
  deleteAnalysis,
  insertAnalysisConfigs,
  getAlgorithmSettings,
} from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import {
  generateConfigurations,
  buildSettingsMap,
  configToDbRow,
} from '@/lib/mattress-configurator';

const uuidSchema = z.string().uuid('Invalid UUID format');

const updateAnalysisSchema = z.object({
  person_label: z.string().optional(),
  sex: z.enum(['male', 'female']).optional(),
  weight_kg: z.number().int().min(30).max(250).optional(),
  height_cm: z.number().int().min(100).max(230).optional(),
  body_shape: z.enum(['v_shape', 'a_shape', 'normal', 'h_shape', 'round']).optional(),
  sleep_position: z.array(z.enum(['side', 'supine', 'prone'])).optional(),
  firmness_preference: z.enum(['soft', 'neutral', 'firm']).optional(),
  health_issues: z.array(z.enum([
    'lordosis', 'kyphosis', 'lower_back_pain',
    'shoulder_pain', 'hip_pain', 'sciatica', 'fibromyalgia',
  ])).optional(),
  circulation_issues: z.boolean().optional(),
  snoring_apnea: z.boolean().optional(),
  reads_watches_in_bed: z.boolean().optional(),
  mattress_width_cm: z.number().int().positive().optional(),
  mattress_length_cm: z.number().int().positive().optional(),
});

type RouteParams = { params: Promise<{ id: string; analysisId: string }> };

/**
 * GET /api/leads/[id]/analyses/[analysisId]
 * Dettaglio singola analisi (con configs)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'read');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { analysisId } = await params;
    if (!uuidSchema.safeParse(analysisId).success) {
      return NextResponse.json({ error: 'Analysis ID must be a valid UUID' }, { status: 400 });
    }

    const analysis = await getAnalysisById(analysisId);
    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    return NextResponse.json(
      { analysis },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      },
    );
  } catch (error) {
    console.error('[API Analysis GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/leads/[id]/analyses/[analysisId]
 * Aggiorna parametri anamnesi → rigenera configurazioni
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { id: leadId, analysisId } = await params;
    if (!uuidSchema.safeParse(analysisId).success) {
      return NextResponse.json({ error: 'Analysis ID must be a valid UUID' }, { status: 400 });
    }

    const body = await request.json();
    const validation = updateAnalysisSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 },
      );
    }

    // 1. Update analysis record
    const updatedAnalysis = await updateAnalysis(analysisId, validation.data);

    // 2. Regenerate configs with updated data
    let settingsMap;
    try {
      const dbSettings = await getAlgorithmSettings();
      settingsMap = buildSettingsMap(dbSettings);
    } catch {
      settingsMap = undefined;
    }

    const configs = generateConfigurations(
      {
        lead_id: leadId,
        weight_kg: updatedAnalysis.weight_kg,
        height_cm: updatedAnalysis.height_cm,
        sex: updatedAnalysis.sex ?? undefined,
        body_shape: updatedAnalysis.body_shape ?? undefined,
        sleep_position: updatedAnalysis.sleep_position ?? [],
        firmness_preference: updatedAnalysis.firmness_preference,
        health_issues: updatedAnalysis.health_issues,
        circulation_issues: updatedAnalysis.circulation_issues,
        snoring_apnea: updatedAnalysis.snoring_apnea,
        reads_watches_in_bed: updatedAnalysis.reads_watches_in_bed,
      },
      settingsMap,
    );

    // 3. Upsert configs (ON CONFLICT updates)
    const dbConfigs = [
      configToDbRow(configs.one, analysisId),
      configToDbRow(configs.plus, analysisId),
      configToDbRow(configs.pro, analysisId),
    ];
    const savedConfigs = await insertAnalysisConfigs(dbConfigs);

    return NextResponse.json(
      { analysis: { ...updatedAnalysis, configs: savedConfigs } },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      },
    );
  } catch (error: unknown) {
    console.error('[API Analysis PUT] Error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/leads/[id]/analyses/[analysisId]
 * Elimina analisi (cascade configs)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { analysisId } = await params;
    if (!uuidSchema.safeParse(analysisId).success) {
      return NextResponse.json({ error: 'Analysis ID must be a valid UUID' }, { status: 400 });
    }

    await deleteAnalysis(analysisId);

    return NextResponse.json(
      { success: true, message: 'Analysis deleted', id: analysisId },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      },
    );
  } catch (error: unknown) {
    console.error('[API Analysis DELETE] Error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
