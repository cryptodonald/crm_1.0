import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId, getAirtableLeadsTableId } from '@/lib/api-keys-service';
import { recordApiLatency } from '@/lib/performance-monitor';

// 💥 DISABLE ALL NEXT.JS CACHING FOR THIS ROUTE
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ORDERS_TABLE_ID = 'tblkqfCMabBpVD1fP'; // ID tabella ordini
const ORDER_ITEMS_TABLE_ID = 'tblxzhMCa5UJOMZqC'; // ID tabella order items

/**
 * GET /api/orders/[id] - Fetch single order by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { id: orderId } = await params;
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get Airtable credentials
    const [apiKey, baseId, leadsTableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableLeadsTableId(),
    ]);

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Airtable credentials not available' },
        { status: 500 }
      );
    }

    console.log(`🔍 Loading single order: ${orderId}`);

    // Fetch single order from Airtable
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${ORDERS_TABLE_ID}/${orderId}`;
    
    console.log('🔗 Airtable URL:', airtableUrl);

    const response = await fetch(airtableUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
      
      const errorText = await response.text();
      console.error('❌ Airtable API error:', response.status, errorText);
      throw new Error(`Airtable error ${response.status}: ${errorText}`);
    }

    const orderRecord = await response.json();
    
    console.log(`📦 Loading order items for order: ${orderId}`);
    
    // Load order items for this order using the IDs from the Order_Items field
    let orderItems: any[] = [];
    const orderItemIds = orderRecord.fields?.Order_Items || [];
    
    if (orderItemIds.length > 0) {
      try {
        console.log(`📦 Loading ${orderItemIds.length} order items:`, orderItemIds);
        
        // Create filter for multiple record IDs
        let filterFormula = '';
        if (orderItemIds.length === 1) {
          filterFormula = `RECORD_ID() = '${orderItemIds[0]}'`;
        } else {
          filterFormula = `OR(${orderItemIds.map(id => `RECORD_ID() = '${id}'`).join(',')})`;
        }
        
        const orderItemsParams = new URLSearchParams();
        orderItemsParams.set('filterByFormula', filterFormula);
        
        const orderItemsUrl = `https://api.airtable.com/v0/${baseId}/${ORDER_ITEMS_TABLE_ID}?${orderItemsParams.toString()}`;
        
        console.log('🔗 Order Items URL:', orderItemsUrl);
        console.log('🔗 Order Items Filter:', filterFormula);
        
        const orderItemsResponse = await fetch(orderItemsUrl, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (orderItemsResponse.ok) {
          const orderItemsData = await orderItemsResponse.json();
          orderItems = orderItemsData.records || [];
          console.log(`✅ Loaded ${orderItems.length} order items successfully`);
        } else {
          const errorText = await orderItemsResponse.text();
          console.error('⚠️ Failed to load order items:', orderItemsResponse.status, errorText);
        }
      } catch (error) {
        console.error('⚠️ Error loading order items:', error);
      }
    } else {
      console.log('ℹ️ No order items found for this order');
    }
    
    // Extract unique lead IDs for lookup if present
    const leadIds = new Set<string>();
    const idLead = orderRecord.fields?.ID_Lead;
    if (Array.isArray(idLead)) {
      idLead.forEach((id: string) => leadIds.add(id));
    }
    
    // Fetch lead names for lookup if there are lead IDs
    let leadsLookup: Record<string, string> = {};
    if (leadIds.size > 0 && leadsTableId) {
      try {
        const params = new URLSearchParams();
        params.set('fields[]', 'Nome');
        
        const leadsUrl = `https://api.airtable.com/v0/${baseId}/${leadsTableId}?${params.toString()}`;
        
        const leadsResponse = await fetch(leadsUrl, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          // Filter records on the client side and build lookup
          leadsData.records?.forEach((record: any) => {
            if (Array.from(leadIds).includes(record.id) && record.fields?.Nome) {
              leadsLookup[record.id] = record.fields.Nome;
            }
          });
        }
      } catch (error) {
        console.error('⚠️ Failed to fetch lead names, continuing without:', error);
      }
    }
    
    // Enrich order record with client name
    let clientName = undefined;
    if (Array.isArray(idLead) && idLead.length > 0) {
      const leadNames = idLead
        .map(leadId => leadsLookup[leadId])
        .filter(name => name)
        .join(', ');
      
      clientName = leadNames || undefined;
    }
    
    // Prepara gli allegati esistenti con parsing unificato
    const existingAttachments = [];
    
    // Contratti - parsing unificato
    if (orderRecord.fields?.URL_Contratto) {
      if (Array.isArray(orderRecord.fields.URL_Contratto)) {
        // Attachment array nativo di Airtable
        existingAttachments.push(...orderRecord.fields.URL_Contratto.map(item => item.url));
      } else if (typeof orderRecord.fields.URL_Contratto === 'object' && orderRecord.fields.URL_Contratto.url) {
        // Singolo attachment object
        existingAttachments.push(orderRecord.fields.URL_Contratto.url);
      } else if (typeof orderRecord.fields.URL_Contratto === 'string') {
        // Nuovo formato JSON o legacy
        try {
          const parsed = JSON.parse(orderRecord.fields.URL_Contratto);
          if (Array.isArray(parsed)) {
            // Nuovo formato: array di {url, filename}
            existingAttachments.push(...parsed.map(item => item.url || item));
          } else {
            // Single object {url, filename}
            existingAttachments.push(parsed.url || orderRecord.fields.URL_Contratto);
          }
        } catch {
          // Legacy: stringa URL semplice
          existingAttachments.push(orderRecord.fields.URL_Contratto);
        }
      }
    }
    
    // Documenti Cliente - parsing unificato
    if (orderRecord.fields?.URL_Documenti_Cliente) {
      if (Array.isArray(orderRecord.fields.URL_Documenti_Cliente)) {
        // Attachment array nativo di Airtable
        existingAttachments.push(...orderRecord.fields.URL_Documenti_Cliente.map(item => item.url));
      } else if (typeof orderRecord.fields.URL_Documenti_Cliente === 'object' && orderRecord.fields.URL_Documenti_Cliente.url) {
        // Singolo attachment object
        existingAttachments.push(orderRecord.fields.URL_Documenti_Cliente.url);
      } else if (typeof orderRecord.fields.URL_Documenti_Cliente === 'string') {
        // Nuovo formato JSON o legacy multiline
        try {
          const parsed = JSON.parse(orderRecord.fields.URL_Documenti_Cliente);
          if (Array.isArray(parsed)) {
            // Nuovo formato: array di {url, filename}
            existingAttachments.push(...parsed.map(item => item.url || item));
          } else {
            // Single object {url, filename}
            existingAttachments.push(parsed.url || orderRecord.fields.URL_Documenti_Cliente);
          }
        } catch {
          // Legacy: formato multiline (nome: URL)
          const docs = orderRecord.fields.URL_Documenti_Cliente.split('\n')
            .filter(line => line.trim())
            .map(line => line.includes(': ') ? line.split(': ')[1] : line)
            .filter(url => url && url.trim());
          existingAttachments.push(...docs);
        }
      }
    }
    
    // Schede Cliente - parsing unificato
    if (orderRecord.fields?.URL_Schede_Cliente) {
      if (Array.isArray(orderRecord.fields.URL_Schede_Cliente)) {
        // Attachment array nativo di Airtable
        existingAttachments.push(...orderRecord.fields.URL_Schede_Cliente.map(item => item.url));
      } else if (typeof orderRecord.fields.URL_Schede_Cliente === 'object' && orderRecord.fields.URL_Schede_Cliente.url) {
        // Singolo attachment object
        existingAttachments.push(orderRecord.fields.URL_Schede_Cliente.url);
      } else if (typeof orderRecord.fields.URL_Schede_Cliente === 'string') {
        // Nuovo formato JSON o legacy
        try {
          const parsed = JSON.parse(orderRecord.fields.URL_Schede_Cliente);
          if (Array.isArray(parsed)) {
            // Nuovo formato: array di {url, filename}
            existingAttachments.push(...parsed.map(item => item.url || item));
          } else {
            // Single object {url, filename}
            existingAttachments.push(parsed.url || orderRecord.fields.URL_Schede_Cliente);
          }
        } catch {
          // Legacy: stringa URL semplice
          existingAttachments.push(orderRecord.fields.URL_Schede_Cliente);
        }
      }
    }
    
    const enrichedRecord = {
      ...orderRecord,
      fields: {
        ...orderRecord.fields,
        Cliente_Nome: clientName,
        Allegati: existingAttachments, // Aggiungi allegati al field per la tabella
      },
      orderItems: orderItems // Aggiungi order items al record
    };
    
    recordApiLatency('orders', 'get_single', Date.now() - startTime);
    
    console.log(`✅ Loaded order ${orderId} successfully`);
    
    return NextResponse.json(enrichedRecord);
    
  } catch (error) {
    console.error('❌ Error fetching single order:', error);
    recordApiLatency('orders', 'get_single_error', Date.now() - startTime);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orders/[id] - Update single order
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { id: orderId } = await params;
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get Airtable credentials
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Airtable credentials not available' },
        { status: 500 }
      );
    }

    // Parse request body
    const { orderData, orderItemsData } = await request.json();
    
    if (!orderData) {
      return NextResponse.json(
        { error: 'Order data is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Updating order: ${orderId}`);
    console.log(`📨 RECEIVED orderData:`, JSON.stringify(orderData, null, 2));
    console.log(`🔍 Stato_Ordine value:`, {
      value: orderData['Stato_Ordine'],
      type: typeof orderData['Stato_Ordine'],
      length: orderData['Stato_Ordine']?.length,
      charCodes: orderData['Stato_Ordine'] ? Array.from(orderData['Stato_Ordine'] as string).map((c: string) => c.charCodeAt(0)) : null,
      raw: JSON.stringify(orderData['Stato_Ordine'])
    });

    // Sanitizza i dati prima dell'invio - rimuovi quote JSON extra
    const sanitizedOrderData: any = {};
    for (const [key, value] of Object.entries(orderData)) {
      if (typeof value === 'string') {
        // Rimuovi quote JSON doppie: "\"Completato\"" -> "Completato"
        let cleaned = value.trim();
        console.log(`🔍 Processing field '${key}':`, {
          original: value,
          originalLength: value.length,
          startsWithQuote: cleaned.startsWith('\"'),
          endsWithQuote: cleaned.endsWith('\"'),
          firstChar: value.charCodeAt(0),
          lastChar: value.charCodeAt(value.length - 1)
        });
        
        if (cleaned.startsWith('\"') && cleaned.endsWith('\"')) {
          cleaned = cleaned.slice(1, -1);
          console.log(`  ✂️ Removed quotes from '${key}': '${value}' -> '${cleaned}'`);
        }
        sanitizedOrderData[key] = cleaned;
      } else {
        sanitizedOrderData[key] = value;
      }
    }

    console.log(`✅ Sanitized order data:`, JSON.stringify(sanitizedOrderData, null, 2));
    console.log(`📤 SENDING TO AIRTABLE Stato_Ordine:`, sanitizedOrderData['Stato_Ordine']);

    // Update order in Airtable
    const updateUrl = `https://api.airtable.com/v0/${baseId}/${ORDERS_TABLE_ID}/${orderId}`;
    
    const requestBody = {
      fields: sanitizedOrderData
    };
    
    const requestBodyString = JSON.stringify(requestBody);
    console.log(`🔍 BODY BEING SENT TO AIRTABLE:`, requestBodyString);
    console.log(`🔍 Stato_Ordine IN BODY:`, JSON.parse(requestBodyString).fields['Stato_Ordine']);
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: requestBodyString,
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Airtable update error:', updateResponse.status, errorText);
      throw new Error(`Update failed: ${updateResponse.status} - ${errorText}`);
    }

    const updatedOrder = await updateResponse.json();
    
    // TODO: Handle order items update when order items table/API is ready
    if (orderItemsData && orderItemsData.length > 0) {
      console.log('📝 Order items to update:', orderItemsData.length);
      // For now, just log the items - implement when order items API is ready
    }
    
    recordApiLatency('orders', 'update', Date.now() - startTime);
    
    console.log(`✅ Order ${orderId} updated successfully`);
    
    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Order updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error updating order:', error);
    recordApiLatency('orders', 'update_error', Date.now() - startTime);
    
    return NextResponse.json(
      { 
        error: 'Failed to update order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/[id] - Delete single order
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { id: orderId } = await params;
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get Airtable credentials
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Airtable credentials not available' },
        { status: 500 }
      );
    }

    console.log(`🗑️ Deleting order: ${orderId}`);

    // Delete order from Airtable
    const deleteUrl = `https://api.airtable.com/v0/${baseId}/${ORDERS_TABLE_ID}/${orderId}`;
    
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!deleteResponse.ok) {
      if (deleteResponse.status === 404) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
      
      const errorText = await deleteResponse.text();
      console.error('❌ Airtable delete error:', deleteResponse.status, errorText);
      throw new Error(`Delete failed: ${deleteResponse.status} - ${errorText}`);
    }

    const deletedOrder = await deleteResponse.json();
    
    recordApiLatency('orders', 'delete', Date.now() - startTime);
    
    console.log(`✅ Order ${orderId} deleted successfully`);
    
    return NextResponse.json({
      success: true,
      deleted: deletedOrder,
      message: 'Order deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting order:', error);
    recordApiLatency('orders', 'delete_error', Date.now() - startTime);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}