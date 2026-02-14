import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getLeads, createLead } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import type { LeadCreateInput, LeadStatus } from '@/types/database';

// Zod validation schemas
const createLeadSchema = z.object({
  name: z.string().min(1, 'name is required').max(200),
  phone: z.string().max(30).nullish(),
  email: z.string().email('Invalid email').max(255).nullish(),
  city: z.string().max(100).nullish(),
  address: z.string().max(500).nullish(),
  postal_code: z.union([z.number().int(), z.string(), z.null()]).optional(),
  gender: z.string().max(20).nullish(),
  needs: z.string().max(10000).nullish(),
  status: z.string().max(50).optional(),
  source_id: z.string().uuid().nullish(),
  assigned_to: z.union([z.array(z.string().uuid()), z.string().uuid(), z.null()]).optional(),
  referral_lead_id: z.string().uuid().nullish(),
});

/**
 * GET /api/leads
 * Fetch leads with optional filters
 * 
 * Query params:
 * - status: comma-separated status values
 * - source_id: source UUID filter
 * - assigned_to: assigned user UUID filter
 * - city: city filter (ILIKE)
 * - search: FTS search query
 * - page: page number (default 1)
 * - limit: results per page (default 50)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let authTime = 0, rateLimitTime = 0, queryTime = 0, serializeTime = 0;
  
  try {
    // Auth check
    const authStart = Date.now();
    const session = await getServerSession(authOptions);
    authTime = Date.now() - authStart;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check (skip in dev for performance)
    const rateLimitStart = Date.now();
    const isDev = process.env.NODE_ENV === 'development';
    const { success, limit: rateLimit, remaining, reset } = isDev 
      ? { success: true, limit: 1000, remaining: 999, reset: Date.now() + 60000 }
      : await checkRateLimit(session.user.email, 'read');
    rateLimitTime = Date.now() - rateLimitStart;
    
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
    const source_id = searchParams.get('source_id') || undefined;
    const assigned_to = searchParams.get('assigned_to') || undefined;
    const city = searchParams.get('city') || undefined;
    const search = searchParams.get('search') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const status = statusParam ? statusParam.split(',') as LeadStatus[] : undefined;
    const page = pageParam ? parseInt(pageParam) : 1;
    const limit = limitParam ? parseInt(limitParam) : 50;

    // Fetch leads with pagination
    const queryStart = Date.now();
    const result = await getLeads({
      status,
      source_id,
      assigned_to,
      city,
      search,
      dateFrom,
      dateTo,
      page,
      limit,
    });
    queryTime = Date.now() - queryStart;
    
    const serializeStart = Date.now();
    const response = NextResponse.json(
      { 
        leads: result.data, 
        total: result.pagination.total,
        pagination: result.pagination,
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
    serializeTime = Date.now() - serializeStart;
    
    const totalTime = Date.now() - startTime;
    console.log(`[API] GET /api/leads timing: auth=${authTime}ms, rateLimit=${rateLimitTime}ms, query=${queryTime}ms, serialize=${serializeTime}ms, total=${totalTime}ms`);
    
    return response;
  } catch (error: unknown) {
    console.error('[API] GET /api/leads error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch leads', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads
 * Create new lead
 * 
 * Body: { name, phone?, email?, city?, needs?, status?, source_id?, assigned_to? }
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

    // Parse & validate body
    const body = await request.json();
    const validation = createLeadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Map validated input to Postgres schema (body is safe after Zod validation)
    const input: LeadCreateInput = {
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      postal_code: body.postal_code || null,
      city: body.city || null,
      needs: body.needs || null,
      status: body.status || 'new',
      gender: body.gender || null,
      source_id: body.source_id || null,
      assigned_to: body.assigned_to || null,
      referral_lead_id: body.referral_lead_id || null,
    };

    // Create lead
    const lead = await createLead(input);

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
  } catch (error: unknown) {
    console.error('[API] POST /api/leads error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create lead', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }
}
