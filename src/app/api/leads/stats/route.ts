import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/postgres';

/**
 * GET /api/leads/stats
 * Get aggregated counts for filters (status, source)
 * Accepts same filters as /api/leads to calculate counts on filtered subset
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse filters from query params
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const source_id = searchParams.get('source_id') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const search = searchParams.get('search') || undefined;

    // Build WHERE clause based on active filters
    const whereClauses: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters (exclude the dimension we're grouping by)
    // For status counts, apply all filters EXCEPT status
    // For source counts, apply all filters EXCEPT source
    
    if (dateFrom) {
      whereClauses.push(`created_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      whereClauses.push(`created_at <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    if (search) {
      whereClauses.push(`search_vector @@ plainto_tsquery('english', $${paramIndex})`);
      params.push(search);
      paramIndex++;
    }

    // Get counts by status (with fonte filter if active)
    const statusWhereClause = [...whereClauses];
    const statusParams = [...params];
    let statusParamIndex = paramIndex;
    
    if (source_id) {
      statusWhereClause.push(`source_id = $${statusParamIndex}`);
      statusParams.push(source_id);
      statusParamIndex++;
    }
    
    const statusWhere = statusWhereClause.length > 0 ? `WHERE ${statusWhereClause.join(' AND ')} AND status IS NOT NULL` : 'WHERE status IS NOT NULL';
    const statusCountsSql = `
      SELECT status, COUNT(*) as count
      FROM leads
      ${statusWhere}
      GROUP BY status
    `;
    const statusCounts = await query<{ status: string; count: string }>(statusCountsSql, statusParams);

    // Get counts by source (with stato filter if active)
    const sourceWhereClause = [...whereClauses];
    const sourceParams = [...params];
    let sourceParamIndex = paramIndex;
    
    const status = statusParam ? statusParam.split(',') : undefined;
    if (status) {
      sourceWhereClause.push(`status = ANY($${sourceParamIndex})`);
      sourceParams.push(status);
      sourceParamIndex++;
    }
    
    const sourceWhere = sourceWhereClause.length > 0 ? `WHERE ${sourceWhereClause.join(' AND ')} AND source_id IS NOT NULL` : 'WHERE source_id IS NOT NULL';
    const sourceCountsSql = `
      SELECT source_id, COUNT(*) as count
      FROM leads
      ${sourceWhere}
      GROUP BY source_id
    `;
    const sourceCounts = await query<{ source_id: string; count: string }>(sourceCountsSql, sourceParams);

    // Convert to lookup objects
    const byStatus: Record<string, number> = {};
    statusCounts.forEach(row => {
      byStatus[row.status] = parseInt(row.count, 10);
    });

    const bySource: Record<string, number> = {};
    sourceCounts.forEach(row => {
      bySource[row.source_id] = parseInt(row.count, 10);
    });

    return NextResponse.json({
      byStatus,
      bySource,
    });
  } catch (error: unknown) {
    console.error('[API] GET /api/leads/stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
