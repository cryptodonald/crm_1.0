import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId, getAirtableLeadsTableId } from '@/lib/api-keys-service';
import { leadsCache } from '@/lib/leads-cache';
import { LeadFormData } from '@/types/leads';

/**
 * GET /api/leads/[id] - Get single lead by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  try {
    const leadId = id;
    
    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // Get Airtable credentials
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableLeadsTableId(),
    ]);
    if (!apiKey || !baseId || !tableId) {
      return NextResponse.json(
        { error: 'Airtable credentials not available' },
        { status: 500 }
      );
    }

    console.log(`🔍 [GET LEAD] Fetching lead: ${leadId}`);

    // Call Airtable API to get single record
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableId}/${leadId}`;
    
    const response = await fetch(airtableUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Usa caching per 30 secondi per migliorare performance
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Airtable API error: ${response.status} - ${errorText}`);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Airtable API error: ${response.status}` },
        { status: response.status }
      );
    }

    const record = await response.json();

    // Transform the data to match our LeadData interface
    const transformedLead = {
      id: record.id,
      createdTime: record.createdTime,
      ...record.fields,
    };

    console.log(`✅ [GET LEAD] Successfully fetched lead: ${leadId}`);
    return NextResponse.json({
      success: true,
      lead: transformedLead,
    });

  } catch (error) {
    console.error('❌ [GET LEAD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/leads/[id] - Update single lead
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  try {
    const leadId = id;
    const body: Partial<LeadFormData> = await request.json();
    
    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 [UPDATE LEAD] Received data:', { leadId, body });

    // Get Airtable credentials
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableLeadsTableId(),
    ]);
    if (!apiKey || !baseId || !tableId) {
      return NextResponse.json(
        { error: 'Airtable credentials not available' },
        { status: 500 }
      );
    }

    // Prepara i dati per Airtable (solo campi forniti)
    const fieldsToUpdate: Record<string, any> = {};
    
    if (body.Nome !== undefined) fieldsToUpdate.Nome = body.Nome.trim();
    if (body.Telefono !== undefined) fieldsToUpdate.Telefono = body.Telefono.trim();
    if (body.Email !== undefined) fieldsToUpdate.Email = body.Email.trim();
    if (body.Indirizzo !== undefined) fieldsToUpdate.Indirizzo = body.Indirizzo.trim();
    if (body.CAP !== undefined) fieldsToUpdate.CAP = body.CAP;
    if (body.Città !== undefined) fieldsToUpdate.Città = body.Città.trim();
    if (body.Esigenza !== undefined) fieldsToUpdate.Esigenza = body.Esigenza.trim();
    if (body.Stato !== undefined) fieldsToUpdate.Stato = body.Stato;
    if (body.Provenienza !== undefined) fieldsToUpdate.Provenienza = body.Provenienza;
    if (body.Note !== undefined) fieldsToUpdate.Note = body.Note.trim();
    if (body.Assegnatario !== undefined) fieldsToUpdate.Assegnatario = body.Assegnatario;
    if (body.Referenza !== undefined) fieldsToUpdate.Referenza = body.Referenza;
    if (body.Allegati !== undefined && Array.isArray(body.Allegati)) {
      // Airtable accetta array di oggetti con almeno { url, filename }
      fieldsToUpdate.Allegati = body.Allegati.map((a: any) => ({
        url: a.url,
        filename: a.filename,
      })).filter((a: any) => a.url);
    }

    const airtableData = {
      fields: fieldsToUpdate,
    };

    console.log('📤 [UPDATE LEAD] Sending to Airtable:', airtableData);

    // Chiamata API Airtable per aggiornare il record
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableId}/${leadId}`;
    
    const response = await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(airtableData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Airtable update error: ${response.status} - ${errorText}`);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to update lead: ${response.status}` },
        { status: response.status }
      );
    }

    const updatedRecord = await response.json();
    console.log('✅ [UPDATE LEAD] Successfully updated:', updatedRecord.id);

    // Invalida la cache dopo l'aggiornamento
    leadsCache.clear();
    console.log('🧹 Cache cleared after lead update');

    // Transform per risposta coerente
    const transformedRecord = {
      id: updatedRecord.id,
      createdTime: updatedRecord.createdTime,
      ...updatedRecord.fields,
    };

    return NextResponse.json({
      success: true,
      lead: transformedRecord,
    });

  } catch (error) {
    console.error('❌ [UPDATE LEAD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leads/[id] - Delete single lead
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  try {
    const leadId = id;
    
    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // Get Airtable credentials
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableLeadsTableId(),
    ]);
    if (!apiKey || !baseId || !tableId) {
      return NextResponse.json(
        { error: 'Airtable credentials not available' },
        { status: 500 }
      );
    }

    console.log(`🗑️ [DELETE LEAD] Attempting to delete lead: ${leadId}`);

    // Chiamata API Airtable per eliminare il record
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableId}/${leadId}`;
    
    const response = await fetch(airtableUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Airtable delete error: ${response.status} - ${errorText}`);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to delete lead: ${response.status}` },
        { status: response.status }
      );
    }

    const deletedRecord = await response.json();
    console.log('✅ [DELETE LEAD] Successfully deleted:', deletedRecord.id);

    // Invalida la cache dopo l'eliminazione
    leadsCache.clear();
    console.log('🧹 Cache cleared after lead deletion');

    return NextResponse.json({
      success: true,
      deleted: true,
      id: deletedRecord.id,
    });

  } catch (error) {
    console.error('❌ [DELETE LEAD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
