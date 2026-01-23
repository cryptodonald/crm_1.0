import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId, getAirtableLeadsTableId } from '@/lib/api-keys-service';
import { leadsCache } from '@/lib/leads-cache';
import { detectDuplicates, DuplicateGroup } from '@/lib/lead-deduplication';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const threshold = parseFloat(searchParams.get('threshold') || '0.85');
    const exactOnly = searchParams.get('exactOnly') === 'true';

    console.log('🔍 [Duplicates API] Starting detection');
    console.log(`📊 Threshold: ${threshold}, Exact only: ${exactOnly}`);

    let leads = await leadsCache.getAll();
    let cacheHit = true;

    if (!leads || leads.length === 0) {
      console.log('📡 [Duplicates API] Cache miss, fetching from Airtable...');
      cacheHit = false;

      const apiKey = await getAirtableKey();
      const baseId = await getAirtableBaseId();
      const tableId = await getAirtableLeadsTableId();

      if (!apiKey || !baseId || !tableId) {
        return NextResponse.json(
          { error: 'Missing Airtable credentials' },
          { status: 500 }
        );
      }

      const params = new URLSearchParams();
      params.set('loadAll', 'true');

      const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?${params.toString()}`;

      const response = await fetch(airtableUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [Duplicates API] Airtable error: ${response.status} - ${errorText}`);
        return NextResponse.json(
          { error: 'Failed to fetch leads from Airtable' },
          { status: 500 }
        );
      }

      const data = await response.json();
      leads = (data.records || []).map((record: any) => ({
        id: record.id,
        createdTime: record.createdTime,
        ...record.fields,
      }));

      console.log(`✅ [Duplicates API] Fetched ${leads.length} leads from Airtable`);
    } else {
      console.log(`✅ [Duplicates API] Using ${leads.length} leads from cache`);
    }

    console.log('🔎 [Duplicates API] Running deduplication algorithm...');
    let groups = detectDuplicates(leads, threshold);

    // Note: exactOnly filtering removed since DuplicateGroup doesn't have matchType field

    console.log(`📊 [Duplicates API] Found ${groups.length} duplicate groups`);

    // Transform groups to include full lead objects
    const duplicatesWithLeads = groups.map((group: any) => {
      const masterLead = leads.find((l: any) => l.id === group.masterId);
      const duplicateLeads = group.duplicateIds
        .map((id: string) => leads.find((l: any) => l.id === id))
        .filter((l: any) => l);

      console.log(
        `  - Master: ${masterLead?.Nome}, Duplicates: ${duplicateLeads.length}, Similarity: ${(group.similarity * 100).toFixed(0)}%`
      );

      return {
        masterId: group.masterId,
        masterLead,
        duplicateIds: group.duplicateIds,
        duplicateLeads,
        similarity: group.similarity,
      };
    });

    return NextResponse.json(
      {
        success: true,
        duplicates: duplicatesWithLeads,
        count: duplicatesWithLeads.length,
        totalLeads: leads.length,
        cacheHit,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ [Duplicates API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to detect duplicates',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
