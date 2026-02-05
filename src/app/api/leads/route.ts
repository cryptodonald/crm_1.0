import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getLeads, createLead } from '@/lib/airtable/leads';
import { checkRateLimit } from '@/lib/ratelimit';

/**
 * GET /api/leads
 * Fetch leads with optional filters
 * 
 * Query params:
 * - status: comma-separated status values
 * - fonte: source filter
 * - search: search query
 * - dateFrom, dateTo: date range
 * - limit: max results (optional, no limit = all leads)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const { success, limit: rateLimit, remaining, reset } = await checkRateLimit(session.user.email, 'read');
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED', retryAfter: reset },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const fonte = searchParams.get('fonte') || undefined;
    const search = searchParams.get('search') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const limitParam = searchParams.get('limit');
    const maxRecords = limitParam ? parseInt(limitParam) : undefined;

    const status = statusParam ? statusParam.split(',') : undefined;

    // Fetch leads (no limit = all leads)
    const leads = await getLeads({
      status,
      fonte,
      search,
      dateFrom,
      dateTo,
      limit: maxRecords,
    });

    return NextResponse.json(
      { leads, total: leads.length },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('[API] GET /api/leads error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leads', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads
 * Create new lead
 * 
 * Body: { Nome, Telefono?, Email?, Città?, Esigenza?, Stato?, Fonte?, Data? }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const { success, limit: rateLimit, remaining, reset } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED', retryAfter: reset },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }

    // Parse body
    const body = await request.json();

    // Validation (basic - use Zod in Step 3)
    if (!body.Nome || typeof body.Nome !== 'string' || body.Nome.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Create lead
    const lead = await createLead({
      Nome: body.Nome,
      Telefono: body.Telefono,
      Email: body.Email,
      Indirizzo: body.Indirizzo,
      CAP: body.CAP,
      Città: body.Città,
      Esigenza: body.Esigenza,
      Stato: body.Stato || 'Nuovo',
      Gender: body.Gender,
      Fonte: body.Fonte,
      Assegnatario: body.Assegnatario,
      Referenza: body.Referenza,
      Data: body.Data,
    });

    return NextResponse.json(
      { lead },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('[API] POST /api/leads error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create lead', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }
}
