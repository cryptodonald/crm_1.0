import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getBlobToken, getAirtableKey, getAirtableBaseId, getAirtableLeadsTableId } from '@/lib/api-keys-service';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

/**
 * DELETE /api/leads/[id]/attachments - Elimina allegato specifico dal lead
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestStart = performance.now();
  
  try {
    console.log('🗑️ [Delete Lead Attachment] Starting DELETE request');
    
    const { id: leadId } = await params;
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');
    const attachmentId = searchParams.get('attachmentId'); // ID dell'attachment Airtable
    
    if (!fileUrl) {
      return NextResponse.json(
        { 
          error: 'URL è richiesto',
          success: false,
        },
        { status: 400 }
      );
    }
    
    console.log(`🗑️ [Delete Lead Attachment] Lead: ${leadId}, URL: ${fileUrl}`);
    
    // Step 1: Ottieni i dati attuali del lead
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableLeadsTableId(),
    ]);
    
    if (!apiKey || !baseId || !tableId) {
      throw new Error('Missing Airtable credentials');
    }
    
    // Fetch current lead
    const leadResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}/${leadId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!leadResponse.ok) {
      throw new Error(`Failed to fetch lead: ${leadResponse.status}`);
    }
    
    const leadData = await leadResponse.json();
    const currentFields = leadData.fields || {};
    
    console.log(`📋 [Delete Lead Attachment] Current lead fields loaded`);
    
    // Step 2: Rimuovi l'allegato dall'array Allegati
    const currentAttachments = currentFields.Allegati || [];
    
    console.log(`🔍 [Delete Lead Attachment] Raw field value for Allegati:`, currentAttachments);
    console.log(`🔍 [Delete Lead Attachment] Field type: ${typeof currentAttachments}`);
    console.log(`🔍 [Delete Lead Attachment] Is array: ${Array.isArray(currentAttachments)}`);
    
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
        console.log(`🔍 [Delete Lead Attachment] Parsed JSON:`, parsedAttachments);
      } catch {
        // Fallback: stringa URL semplice
        parsedAttachments = [{ url: currentAttachments, filename: 'File' }];
        console.log(`🔍 [Delete Lead Attachment] Fallback single URL`);
      }
    } else if (currentAttachments && typeof currentAttachments === 'object' && currentAttachments.url) {
      // Singolo oggetto attachment
      parsedAttachments = [currentAttachments];
    } else {
      console.log(`⚠️ [Delete Lead Attachment] Unknown attachment format:`, currentAttachments);
      parsedAttachments = [];
    }
    
    console.log(`🔍 [Delete Lead Attachment] Parsed attachments (${parsedAttachments.length}):`, parsedAttachments);
    
    // Filtra l'allegato da rimuovere (confronta per URL o ID)
    const updatedAttachments = parsedAttachments.filter(attachment => {
      const attachmentUrl = attachment.url || attachment;
      const attachmentIdMatch = attachmentId && attachment.id === attachmentId;
      const urlMatch = attachmentUrl === fileUrl;
      const shouldRemove = attachmentIdMatch || urlMatch;
      
      console.log(`  - Checking attachment:`, {
        url: attachmentUrl,
        id: attachment.id,
        urlMatch,
        attachmentIdMatch,
        shouldRemove
      });
      
      return !shouldRemove;
    });
    
    console.log(`🔄 [Delete Lead Attachment] Updating Allegati: ${parsedAttachments.length} -> ${updatedAttachments.length}`);
    
    if (updatedAttachments.length === parsedAttachments.length) {
      console.log(`⚠️ [Delete Lead Attachment] WARNING: No attachment was removed! URL/ID might not match.`);
      console.log(`  Target URL: ${fileUrl}`);
      console.log(`  Target ID: ${attachmentId}`);
      console.log(`  Available URLs:`, parsedAttachments.map(att => att.url || att));
      console.log(`  Available IDs:`, parsedAttachments.map(att => att.id));
    }
    
    // Step 3: Aggiorna Airtable
    const updateBody: any = {
      fields: {}
    };
    
    // IMPORTANTE: Per pulire il campo dobbiamo inviare esplicitamente il nuovo valore
    if (updatedAttachments.length > 0) {
      // Se ci sono ancora allegati, aggiorna con il nuovo JSON
      updateBody.fields.Allegati = JSON.stringify(updatedAttachments);
      console.log(`📤 [Delete Lead Attachment] Sending field Allegati with JSON:`, JSON.stringify(updatedAttachments));
    } else {
      // Se non ci sono più allegati, pulisci il campo inviando stringa vuota
      updateBody.fields.Allegati = "";
      console.log(`📤 [Delete Lead Attachment] Clearing field Allegati (sending empty string)`);
    }
    
    const updateResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}/${leadId}`,
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
    
    console.log(`✅ [Delete Lead Attachment] Airtable updated successfully`);
    
    // Step 4: Prova a eliminare dal blob storage (best effort)
    let blobDeleted = false;
    let blobDeleteReason = 'unknown';
    
    console.log(`🔍 [Delete Lead Attachment] Debug blob delete:`);
    console.log(`  - File URL: ${fileUrl}`);
    console.log(`  - URL includes blob.vercel-storage.com: ${fileUrl.includes('blob.vercel-storage.com')}`);
    console.log(`  - URL includes .vercel.app: ${fileUrl.includes('.vercel.app')}`);
    
    const blobToken = await getBlobToken();
    console.log(`  - Blob token available: ${!!blobToken}`);
    
    // Controlla diversi pattern di URL Vercel Blob
    const isVercelBlobUrl = fileUrl.includes('blob.vercel-storage.com') || 
                           fileUrl.includes('.vercel.app/_vercel/blob/');
    
    // Rileva URL di Airtable
    const isAirtableUrl = fileUrl.includes('airtableusercontent.com');
    
    console.log(`  - Is Vercel Blob URL: ${isVercelBlobUrl}`);
    console.log(`  - Is Airtable URL: ${isAirtableUrl}`);
    
    if (isAirtableUrl) {
      // URL Airtable - non possiamo eliminare dal blob storage
      blobDeleteReason = 'airtable-managed';
      console.log(`📄 [Delete Lead Attachment] Airtable-managed file - cannot delete from blob storage`);
    } else if (blobToken && isVercelBlobUrl) {
      try {
        console.log(`🗑️ [Delete Lead Attachment] Attempting Vercel Blob delete`);
        console.log(`  - Original URL: ${fileUrl}`);
        
        // Prova a pulire l'URL se necessario
        let cleanUrl = fileUrl.trim();
        
        // Prova anche a decode l'URL se è encoded
        try {
          const decodedUrl = decodeURIComponent(cleanUrl);
          if (decodedUrl !== cleanUrl) {
            console.log(`🔓 [Delete Lead Attachment] Decoded URL: ${decodedUrl}`);
            cleanUrl = decodedUrl;
          }
        } catch (decodeError) {
          console.warn(`⚠️ [Delete Lead Attachment] URL decode failed:`, decodeError);
        }
        
        await del(cleanUrl, { token: blobToken });
        
        console.log(`✅ [Delete Lead Attachment] Vercel Blob deleted successfully`);
        blobDeleted = true;
        blobDeleteReason = 'success';
      } catch (blobError) {
        console.error(`❌ [Delete Lead Attachment] Vercel Blob delete failed:`, blobError);
        console.error(`❌ [Delete Lead Attachment] Error message: ${blobError instanceof Error ? blobError.message : String(blobError)}`);
        blobDeleteReason = `error: ${blobError instanceof Error ? blobError.message : String(blobError)}`;
        // Non bloccante - l'allegato è già stato rimosso da Airtable
      }
    } else {
      blobDeleteReason = `skipped - token: ${!!blobToken}, isVercelUrl: ${isVercelBlobUrl}, isAirtableUrl: ${isAirtableUrl}`;
      console.log(`ℹ️ [Delete Lead Attachment] Skipping blob delete: ${blobDeleteReason}`);
    }
    
    const totalTime = performance.now() - requestStart;
    recordApiLatency('delete_lead_attachment', totalTime, false);
    
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
    
    recordError('delete_lead_attachment', errorMessage);
    recordApiLatency('delete_lead_attachment', totalTime, false);
    
    console.error(`❌ [Delete Lead Attachment] Error in ${totalTime.toFixed(2)}ms:`, error);
    
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