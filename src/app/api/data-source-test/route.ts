import { NextRequest, NextResponse } from 'next/server';
import { 
  getLeads, 
  getLeadById, 
  getActivities,
  healthCheck,
  getMetrics,
  clearMetrics 
} from '@/lib/data-source';

/**
 * TEST ENDPOINT per Dual-Read Layer
 * 
 * GET /api/data-source-test?action=health
 * GET /api/data-source-test?action=leads&limit=10
 * GET /api/data-source-test?action=lead&id=recXXX
 * GET /api/data-source-test?action=activities&leadId=recXXX
 * GET /api/data-source-test?action=metrics
 * POST /api/data-source-test?action=clear-metrics
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  
  try {
    switch (action) {
      case 'health': {
        const health = await healthCheck();
        return NextResponse.json({
          status: 'ok',
          usePostgres: process.env.USE_POSTGRES === 'true',
          health,
        });
      }
      
      case 'leads': {
        const limit = parseInt(searchParams.get('limit') || '10');
        const stato = searchParams.get('stato') || undefined;
        
        clearMetrics(); // Reset per test pulito
        const leads = await getLeads({ limit, stato });
        const metrics = getMetrics();
        
        return NextResponse.json({
          status: 'ok',
          count: leads.length,
          leads: leads.slice(0, 3), // Solo primi 3 per brevità
          metrics,
        });
      }
      
      case 'lead': {
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json(
            { error: 'Missing id parameter' },
            { status: 400 }
          );
        }
        
        clearMetrics();
        const lead = await getLeadById(id);
        const metrics = getMetrics();
        
        return NextResponse.json({
          status: 'ok',
          lead,
          metrics,
        });
      }
      
      case 'activities': {
        const leadId = searchParams.get('leadId') || undefined;
        const limit = parseInt(searchParams.get('limit') || '10');
        
        clearMetrics();
        const activities = await getActivities({ leadId, limit });
        const metrics = getMetrics();
        
        return NextResponse.json({
          status: 'ok',
          count: activities.length,
          activities: activities.slice(0, 3),
          metrics,
        });
      }
      
      case 'metrics': {
        const metrics = getMetrics();
        
        // Calcola statistiche
        const stats = {
          total: metrics.length,
          postgres: metrics.filter(m => m.source === 'postgres').length,
          airtable: metrics.filter(m => m.source === 'airtable').length,
          avgLatencyPg: metrics
            .filter(m => m.source === 'postgres' && m.success)
            .reduce((sum, m) => sum + m.duration, 0) / 
            (metrics.filter(m => m.source === 'postgres' && m.success).length || 1),
          avgLatencyAt: metrics
            .filter(m => m.source === 'airtable' && m.success)
            .reduce((sum, m) => sum + m.duration, 0) / 
            (metrics.filter(m => m.source === 'airtable' && m.success).length || 1),
          errors: metrics.filter(m => !m.success).length,
        };
        
        return NextResponse.json({
          status: 'ok',
          stats,
          metrics: metrics.slice(-20), // Ultimi 20
        });
      }
      
      default:
        return NextResponse.json({
          status: 'ok',
          message: 'Data Source Test API',
          actions: [
            'health',
            'leads?limit=10&stato=Attivo',
            'lead?id=recXXX',
            'activities?leadId=recXXX&limit=10',
            'metrics',
          ],
        });
    }
  } catch (error: any) {
    return NextResponse.json(
      { 
        status: 'error',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  
  if (action === 'clear-metrics') {
    clearMetrics();
    return NextResponse.json({
      status: 'ok',
      message: 'Metrics cleared',
    });
  }
  
  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  );
}
