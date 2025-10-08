import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getBlobToken, getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

const ORDERS_TABLE_ID = 'tblf9kcR9xjLvGkVn';

/**
 * DELETE /api/orders/[id]/attachments - Elimina allegato specifico dall'ordine
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestStart = performance.now();
  
  try {
    console.log('🗑️ [Delete Attachment] Starting DELETE request');
    
    const { id: orderId } = await params;
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');
    const category = searchParams.get('category'); // contracts, customer_documents, customer_sheets
    const index = searchParams.get('index'); // index nell'array
    
    if (!fileUrl || !category) {
      return NextResponse.json(
        { 
          error: 'URL e categoria sono richiesti',
          success: false,
        },
        { status: 400 }
      );
    }
    
    console.log(`🗑️ [Delete Attachment] Order: ${orderId}, Category: ${category}, URL: ${fileUrl}`);
    
    // Step 1: Ottieni i dati attuali dell'ordine
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);
    
    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable credentials');
    }
    
    // Fetch current order
    const orderResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/${ORDERS_TABLE_ID}/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!orderResponse.ok) {
      throw new Error(`Failed to fetch order: ${orderResponse.status}`);
    }
    
    const orderData = await orderResponse.json();
    const currentFields = orderData.fields || {};
    
    console.log(`📋 [Delete Attachment] Current order fields loaded`);
    
    // Step 2: Rimuovi l'allegato dall'array appropriato
    const fieldMap = {
      contracts: 'URL_Contratto',
      customer_documents: 'URL_Documenti_Cliente', 
      customer_sheets: 'URL_Schede_Cliente'
    };
    
    const fieldName = fieldMap[category as keyof typeof fieldMap];
    const currentAttachments = currentFields[fieldName] || [];
    
    console.log(`🔍 [Delete Attachment] Raw field value for ${fieldName}:`, currentAttachments);
    console.log(`🔍 [Delete Attachment] Field type: ${typeof currentAttachments}`);
    console.log(`🔍 [Delete Attachment] Is array: ${Array.isArray(currentAttachments)}`);
    
    let parsedAttachments = [];
    
    // Parsing unificato per gestire tutti i formati
    if (Array.isArray(currentAttachments)) {
      // Già un array (attachment nativo Airtable o JSON già parsato)
      parsedAttachments = currentAttachments;
    } else if (typeof currentAttachments === 'string') {
      // Stringa JSON da parsare
      try {
        const parsed = JSON.parse(currentAttachments);
        parsedAttachments = Array.isArray(parsed) ? parsed : [parsed];
        console.log(`🔍 [Delete Attachment] Parsed JSON:`, parsedAttachments);
      } catch {
        // Fallback: stringa URL semplice
        parsedAttachments = [{ url: currentAttachments, filename: 'File' }];
        console.log(`🔍 [Delete Attachment] Fallback single URL`);
      }
    } else if (currentAttachments && typeof currentAttachments === 'object' && currentAttachments.url) {
      // Singolo oggetto attachment
      parsedAttachments = [currentAttachments];
    } else {
      console.log(`⚠️ [Delete Attachment] Unknown attachment format:`, currentAttachments);
      parsedAttachments = [];
    }
    
    console.log(`🔍 [Delete Attachment] Parsed attachments (${parsedAttachments.length}):`, parsedAttachments);
    
    // Filtra l'allegato da rimuovere
    const updatedAttachments = parsedAttachments.filter(attachment => {
      const attachmentUrl = attachment.url || attachment;
      const matches = attachmentUrl === fileUrl;
      console.log(`  - Checking: ${attachmentUrl} === ${fileUrl} ? ${matches}`);
      return !matches;
    });
    
    console.log(`🔄 [Delete Attachment] Updating ${fieldName}: ${parsedAttachments.length} -> ${updatedAttachments.length}`);
    
    if (updatedAttachments.length === parsedAttachments.length) {
      console.log(`⚠️ [Delete Attachment] WARNING: No attachment was removed! URL might not match.`);
      console.log(`  Target URL: ${fileUrl}`);
      console.log(`  Available URLs:`, parsedAttachments.map(att => att.url || att));
    }
    
    // Step 3: Aggiorna Airtable
    const updateBody: any = {
      fields: {}
    };
    
    // IMPORTANTE: Per pulire il campo dobbiamo inviare esplicitamente il nuovo valore
    if (updatedAttachments.length > 0) {
      // Se ci sono ancora allegati, aggiorna con il nuovo JSON
      updateBody.fields[fieldName] = JSON.stringify(updatedAttachments);
      console.log(`📤 [Delete Attachment] Sending field ${fieldName} with JSON:`, JSON.stringify(updatedAttachments));
    } else {
      // Se non ci sono più allegati, pulisci il campo inviando stringa vuota
      updateBody.fields[fieldName] = "";
      console.log(`📤 [Delete Attachment] Clearing field ${fieldName} (sending empty string)`);
    }
    
    const updateResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/${ORDERS_TABLE_ID}/${orderId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateBody),
      }
    );
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update Airtable: ${updateResponse.status} ${errorText}`);
    }
    
    console.log(`✅ [Delete Attachment] Airtable updated successfully`);
    
    // Step 4: Prova a eliminare dal blob storage (best effort)
    let blobDeleted = false;
    let blobDeleteReason = 'unknown';
    
    console.log(`🔍 [Delete Attachment] Debug blob delete:`);
    console.log(`  - File URL: ${fileUrl}`);
    console.log(`  - URL includes blob.vercel-storage.com: ${fileUrl.includes('blob.vercel-storage.com')}`);
    console.log(`  - URL includes .vercel.app: ${fileUrl.includes('.vercel.app')}`);
    
    const blobToken = await getBlobToken();
    console.log(`  - Blob token available: ${!!blobToken}`);
    
    // Controlla diversi pattern di URL Vercel Blob (PIÙ SPECIFICO)
    const isVercelBlobUrl = fileUrl.includes('blob.vercel-storage.com') || 
                           fileUrl.includes('.vercel.app/_vercel/blob/');
    
    // Rileva URL di Airtable
    const isAirtableUrl = fileUrl.includes('airtableusercontent.com');
    
    console.log(`  - Is Vercel Blob URL: ${isVercelBlobUrl}`);
    console.log(`  - Is Airtable URL: ${isAirtableUrl}`);
    
    if (isAirtableUrl) {
      // URL Airtable - non possiamo eliminare dal blob storage
      blobDeleteReason = 'airtable-managed';
      console.log(`📄 [Delete Attachment] Airtable-managed file - cannot delete from blob storage`);
    } else if (blobToken && isVercelBlobUrl) {
      try {
        console.log(`🗑️ [Delete Attachment] Attempting Vercel Blob delete`);
        console.log(`  - Original URL: ${fileUrl}`);
        console.log(`  - Token available: ${blobToken.substring(0, 10)}...`);
        console.log(`  - URL domain: ${new URL(fileUrl).hostname}`);
        console.log(`  - Expected pattern: rwuyz7sohysfo8fr.public.blob.vercel-storage.com`);
        
        // Analizza il formato dell'URL
        console.log(`🔍 [Delete Attachment] URL Analysis:`);
        console.log(`  - URL length: ${fileUrl.length}`);
        console.log(`  - URL starts with https://: ${fileUrl.startsWith('https://')}`);
        console.log(`  - URL ends with extension: ${/\.[a-zA-Z0-9]+$/.test(fileUrl)}`);
        console.log(`  - URL contains spaces: ${fileUrl.includes(' ')}`);
        console.log(`  - URL contains special chars: ${/[<>"'{}|\\^`\[\]]/.test(fileUrl)}`);
        console.log(`  - URL encoded parts: ${fileUrl !== decodeURIComponent(fileUrl)}`);
        
        // Prova a pulire l'URL se necessario
        let cleanUrl = fileUrl.trim();
        
        // Prova anche a decode l'URL se è encoded
        try {
          const decodedUrl = decodeURIComponent(cleanUrl);
          if (decodedUrl !== cleanUrl) {
            console.log(`🔓 [Delete Attachment] Decoded URL: ${decodedUrl}`);
            cleanUrl = decodedUrl;
          }
        } catch (decodeError) {
          console.warn(`⚠️ [Delete Attachment] URL decode failed:`, decodeError);
        }
        
        if (cleanUrl !== fileUrl) {
          console.log(`🧩 [Delete Attachment] Cleaned URL: ${cleanUrl}`);
        }
        
        await del(cleanUrl, { token: blobToken });
        
        console.log(`✅ [Delete Attachment] Vercel Blob deleted successfully`);
        blobDeleted = true;
        blobDeleteReason = 'success';
      } catch (blobError) {
        console.error(`❌ [Delete Attachment] Vercel Blob delete failed:`, blobError);
        console.error(`❌ [Delete Attachment] Error message: ${blobError instanceof Error ? blobError.message : String(blobError)}`);
        blobDeleteReason = `error: ${blobError instanceof Error ? blobError.message : String(blobError)}`;
        // Non bloccante - l'allegato è già stato rimosso da Airtable
      }
    } else {
      blobDeleteReason = `skipped - token: ${!!blobToken}, isVercelUrl: ${isVercelBlobUrl}, isAirtableUrl: ${isAirtableUrl}`;
      console.log(`ℹ️ [Delete Attachment] Skipping blob delete: ${blobDeleteReason}`);
    }
    
    const totalTime = performance.now() - requestStart;
    recordApiLatency('delete_attachment', totalTime, false);
    
    return NextResponse.json({
      success: true,
      message: 'Allegato eliminato con successo',
      blobDeleted,
      blobDeleteReason,
      attachmentsRemaining: updatedAttachments.length,
      debugInfo: {
        originalUrl: fileUrl,
        isVercelBlobUrl,
        hasToken: !!blobToken
      },
      _timing: {
        total: Math.round(totalTime),
      }
    });
    
  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('delete_attachment', errorMessage);
    recordApiLatency('delete_attachment', totalTime, false);
    
    console.error(`❌ [Delete Attachment] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete attachment',
        success: false,
        details: errorMessage,
        _timing: {
          total: Math.round(totalTime),
        }
      },
      { status: 500 }
    );
  }
}