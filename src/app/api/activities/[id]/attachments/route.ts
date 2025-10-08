import { NextRequest, NextResponse } from 'next/server';
import { 
  getAirtableKey,
  getAirtableBaseId,
  getAirtableActivitiesTableId,
} from '@/lib/api-keys-service';
import { invalidateActivitiesCache } from '@/lib/cache';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';
import { del } from '@vercel/blob';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestStart = performance.now();
  
  try {
    const resolvedParams = await params;
    const { searchParams } = new URL(request.url);
    const attachmentUrl = searchParams.get('url');
    
    console.log('🗑️ [ACTIVITY ATTACHMENTS] Starting DELETE request for activity ID:', resolvedParams.id);
    console.log('🔗 [ACTIVITY ATTACHMENTS] Attachment URL to delete:', attachmentUrl);
    
    if (!attachmentUrl) {
      return NextResponse.json(
        { error: 'URL allegato richiesto' },
        { status: 400 }
      );
    }

    const credentialsStart = performance.now();
    
    // Get credentials from API Key Service
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableActivitiesTableId(),
    ]);
    
    const credentialsTime = performance.now() - credentialsStart;
    console.log(`🔑 [TIMING] Activities attachments DELETE credentials: ${credentialsTime.toFixed(2)}ms`);

    // Validate all credentials are available
    if (!apiKey || !baseId || !tableId) {
      throw new Error('Missing Airtable credentials for activities');
    }

    // First, fetch the current activity to get attachments
    const fetchStart = performance.now();
    const fetchResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${resolvedParams.id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch activity: ${fetchResponse.status}`);
    }

    const activityRecord = await fetchResponse.json();
    const fetchTime = performance.now() - fetchStart;
    console.log(`🚀 [TIMING] Activity fetch: ${fetchTime.toFixed(2)}ms`);
    
    console.log('📋 [ACTIVITY ATTACHMENTS] Current activity data:', {
      id: activityRecord.id,
      attachments: activityRecord.fields.Allegati
    });

    // Parse current attachments - handle both string and array formats
    let currentAttachments: any[] = [];
    
    if (activityRecord.fields.Allegati) {
      if (typeof activityRecord.fields.Allegati === 'string') {
        // New format: JSON string
        try {
          currentAttachments = JSON.parse(activityRecord.fields.Allegati);
        } catch (e) {
          console.warn('⚠️ Failed to parse attachments as JSON, treating as empty array');
          currentAttachments = [];
        }
      } else if (Array.isArray(activityRecord.fields.Allegati)) {
        // Old format: direct array
        currentAttachments = activityRecord.fields.Allegati;
      }
    }
    
    console.log('📎 [ACTIVITY ATTACHMENTS] Parsed current attachments:', currentAttachments);
    console.log('🔍 [ACTIVITY ATTACHMENTS] Looking for URL to remove:', attachmentUrl);

    // Filter out the attachment to delete
    const updatedAttachments = currentAttachments.filter(attachment => {
      const shouldKeep = attachment.url !== attachmentUrl;
      console.log(`📋 [ACTIVITY ATTACHMENTS] Attachment ${attachment.url}: ${shouldKeep ? 'keeping' : 'removing'}`);
      return shouldKeep;
    });
    
    console.log('📎 [ACTIVITY ATTACHMENTS] Updated attachments:', updatedAttachments);
    console.log(`📊 [ACTIVITY ATTACHMENTS] Removed ${currentAttachments.length - updatedAttachments.length} attachment(s)`);

    // Prepare update payload
    let updateFields: any = {};
    if (updatedAttachments.length > 0) {
      // Still have attachments, save as JSON string
      updateFields.Allegati = JSON.stringify(updatedAttachments);
    } else {
      // No attachments left, send null to clear the field
      updateFields.Allegati = null;
    }

    // Update activity in Airtable
    const updateStart = performance.now();
    const updateResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${resolvedParams.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: updateFields
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.text();
      console.error('❌ [ACTIVITY ATTACHMENTS] Airtable update error:', errorData);
      throw new Error(`Failed to update activity: ${updateResponse.status}`);
    }

    const updateResult = await updateResponse.json();
    const updateTime = performance.now() - updateStart;
    console.log(`🚀 [TIMING] Airtable update: ${updateTime.toFixed(2)}ms`);
    
    console.log('✅ [ACTIVITY ATTACHMENTS] Activity updated successfully in Airtable');

    // Delete from Vercel Blob if it's a blob URL
    let blobDeleted = false;
    if (attachmentUrl.includes('blob.vercel-storage.com')) {
      try {
        const deleteStart = performance.now();
        await del(attachmentUrl);
        const deleteTime = performance.now() - deleteStart;
        console.log(`🚀 [TIMING] Blob deletion: ${deleteTime.toFixed(2)}ms`);
        console.log('✅ [ACTIVITY ATTACHMENTS] File deleted from Vercel Blob successfully');
        blobDeleted = true;
      } catch (blobError) {
        console.error('❌ [ACTIVITY ATTACHMENTS] Failed to delete from blob:', blobError);
        // Continue execution - attachment removed from database even if blob deletion fails
      }
    } else {
      console.log('ℹ️ [ACTIVITY ATTACHMENTS] Attachment URL is not from Vercel Blob, skipping blob deletion');
    }

    const totalTime = performance.now() - requestStart;
    
    // Record performance metrics
    recordApiLatency('activity_attachments_delete_api', totalTime, false);
    
    console.log(`✅ [ACTIVITY ATTACHMENTS] Attachment deletion completed in ${totalTime.toFixed(2)}ms`);

    // Prepare response BEFORE cache invalidation
    const apiResponse = NextResponse.json({
      success: true,
      message: 'Allegato eliminato con successo',
      attachmentRemoved: {
        url: attachmentUrl,
        blobDeleted
      },
      remainingAttachments: updatedAttachments.length,
      _timing: {
        total: Math.round(totalTime),
        credentials: Math.round(credentialsTime),
        fetch: Math.round(fetchTime),
        update: Math.round(updateTime),
      }
    });
    
    // Non-blocking cache invalidation in background
    invalidateActivitiesCache().catch(err => 
      console.error('⚠️ [ACTIVITY ATTACHMENTS DELETE] Background cache invalidation failed:', err)
    );
    
    return apiResponse;
  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Record error metrics
    recordError('activity_attachments_delete_api', errorMessage);
    recordApiLatency('activity_attachments_delete_api', totalTime, false);
    
    console.error(`❌ [ACTIVITY ATTACHMENTS] DELETE Error in ${totalTime.toFixed(2)}ms:`, error);
    
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