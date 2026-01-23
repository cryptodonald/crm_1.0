import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId, getAirtableLeadsTableId } from '@/lib/api-keys-service';
import { leadsCache } from '@/lib/leads-cache';
import { detectDuplicates, DuplicateGroup } from '@/lib/lead-deduplication';
import { getAirtableClient } from '@/lib/airtable/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const threshold = parseFloat(searchParams.get('threshold') || '0.85');
    const exactOnly = searchParams.get('exactOnly') === 'true';

    console.log('🔍 [Duplicates API] Starting detection');
    console.log(`📊 Threshold: ${threshold}, Exact only: ${exactOnly}`);

    // Fetch ALL leads using Airtable client with pagination
    console.log('📡 [Duplicates API] Fetching ALL leads from Airtable with pagination...');

    const tableId = await getAirtableLeadsTableId();
    if (!tableId) {
      return NextResponse.json(
        { error: 'Missing Airtable table ID' },
        { status: 500 }
      );
    }

    const client = getAirtableClient();
    const records = await client.list(tableId, {
      sort: [
        {
          field: 'Data',
          direction: 'desc',
        },
      ],
    });

    let leads = records.map((record: any) => ({
      id: record.id,
      createdTime: record.createdTime,
      ...record.fields,
    }));

    console.log(`✅ [Duplicates API] Fetched ${leads.length} leads from Airtable`);
    
    // Debug: Check if Nome field exists
    console.log('🔍 [Duplicates API] Checking lead structure...');
    const sampleLead = leads[0];
    console.log(`  First lead keys: ${Object.keys(sampleLead || {}).join(', ')}`);
    console.log(`  First lead Nome: "${sampleLead?.Nome}"`);
    console.log(`  First lead Telefono: "${sampleLead?.Telefono}"`);
    
    // Filter leads that have same phone
    const phoneDuplicates = new Map();
    leads.forEach((lead: any) => {
      if (lead.Telefono) {
        if (!phoneDuplicates.has(lead.Telefono)) {
          phoneDuplicates.set(lead.Telefono, []);
        }
        phoneDuplicates.get(lead.Telefono).push(lead);
      }
    });
    
    console.log('📋 [Duplicates API] Leads with duplicate phones:');
    for (const [phone, leadsWithPhone] of phoneDuplicates) {
      if (leadsWithPhone.length > 1) {
        console.log(`  Phone "${phone}": ${leadsWithPhone.length} leads`);
        leadsWithPhone.forEach((lead: any, idx: number) => {
          console.log(`    [${idx}] ${lead.Nome} | ${lead.Telefono}`);
        });
      }
    }
    
    console.log('\n🔎 [Duplicates API] All Luigi/Graziani leads:');
    leads.forEach((lead: any) => {
      if ((lead.Nome?.toLowerCase().includes('luigi') || lead.Nome?.toLowerCase().includes('graziani')) && lead.Nome) {
        console.log(`  "${lead.Nome}" | ${lead.Telefono}`);
      }
    });

    console.log('🔎 [Duplicates API] Running deduplication algorithm...');
    let groups = detectDuplicates(leads, threshold);
    
    // Log all groups found
    console.log(`\n📊 [Duplicates API] Found ${groups.length} groups:`);
    groups.forEach((group: any, idx: number) => {
      const masterLead = leads.find((l: any) => l.id === group.masterId);
      console.log(`  Group ${idx}: Master="${masterLead?.Nome}" (${masterLead?.Telefono}), Duplicates=${group.duplicateIds.length}, Similarity=${(group.similarity * 100).toFixed(0)}%`);
      group.duplicateIds.forEach((dupId: string) => {
        const dupLead = leads.find((l: any) => l.id === dupId);
        console.log(`    - "${dupLead?.Nome}" (${dupLead?.Telefono})`);
      });
    });

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
