import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { getBlobToken } from '@/lib/api-keys-service';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

export async function POST(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    console.log('🔧 [Upload API] Starting POST request');
    
    const parseStart = performance.now();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || 'general'; // Default category
    const parseTime = performance.now() - parseStart;
    console.log(`📁 [TIMING] Upload parsing: ${parseTime.toFixed(2)}ms`);
    console.log(`📂 [CATEGORY] Upload category: ${category}`);
    
    if (!file) {
      recordError('upload_api', 'No file provided');
      return NextResponse.json(
        { 
          error: 'No file provided',
          success: false,
        },
        { status: 400 }
      );
    }

    // Validazione del file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      recordError('upload_api', `File too large: ${file.size} bytes`);
      return NextResponse.json(
        { 
          error: 'File troppo grande (max 10MB)',
          success: false,
          details: `File size: ${Math.round(file.size / 1024 / 1024)}MB`,
        },
        { status: 400 }
      );
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      recordError('upload_api', `Unsupported file type: ${file.type}`);
      return NextResponse.json(
        { 
          error: 'Tipo di file non supportato',
          success: false,
          details: `File type: ${file.type}`,
        },
        { status: 400 }
      );
    }

    console.log(`📝 [Upload API] Validating file: ${file.name} (${Math.round(file.size / 1024)}KB, ${file.type})`);
    
    const credentialsStart = performance.now();
    // Ottieni il token Vercel Blob
    const blobToken = await getBlobToken();
    const credentialsTime = performance.now() - credentialsStart;
    console.log(`🔑 [TIMING] Upload credentials: ${credentialsTime.toFixed(2)}ms`);
    
    if (!blobToken) {
      throw new Error('Vercel Blob token not available');
    }

    console.log('🔄 [BLOB UPLOAD] Starting upload for:', file.name);

    // Genera un nome file univoco con categoria appropriata
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${category}/${timestamp}-${cleanFileName}`;
    
    const uploadStart = performance.now();

    // Carica il file su Vercel Blob
    const blob = await put(uniqueFileName, file, {
      access: 'public',
      token: blobToken,
    });
    
    const uploadTime = performance.now() - uploadStart;
    console.log(`🚀 [TIMING] Blob upload: ${uploadTime.toFixed(2)}ms`);

    console.log('✅ [BLOB UPLOAD] Success:', blob.url);
    console.log('🔍 [BLOB UPLOAD] Debug URL info:');
    console.log(`  - Full blob object:`, blob);
    console.log(`  - URL: ${blob.url}`);
    console.log(`  - URL type: ${typeof blob.url}`);
    console.log(`  - Contains blob.vercel-storage.com: ${blob.url.includes('blob.vercel-storage.com')}`);
    console.log(`  - Contains .vercel.app: ${blob.url.includes('.vercel.app')}`);

    // Restituisci il formato compatibile con Airtable
    const airtableAttachment = {
      id: crypto.randomUUID(),
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
      ...(file.type.startsWith('image/') && {
        thumbnails: {
          small: { url: blob.url, width: 36, height: 36 },
          large: { url: blob.url, width: 200, height: 200 },
        }
      })
    };
    
    const totalTime = performance.now() - requestStart;
    
    // 📈 Record performance metrics
    recordApiLatency('upload_api', totalTime, false);
    
    console.log(`✅ [Upload API] Completed: ${file.name} uploaded in ${totalTime.toFixed(2)}ms`);

    return NextResponse.json({
      success: true,
      attachment: airtableAttachment,
      _timing: {
        total: Math.round(totalTime),
        parse: Math.round(parseTime),
        credentials: Math.round(credentialsTime),
        upload: Math.round(uploadTime),
      }
    });
  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 📈 Record error metrics
    recordError('upload_api', errorMessage);
    recordApiLatency('upload_api', totalTime, false);
    
    console.error(`❌ [Upload API] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
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

/**
 * DELETE /api/upload - Delete file from blob storage
 */
export async function DELETE(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    console.log('🗑️ [Delete API] Starting DELETE request');
    
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');
    
    if (!fileUrl) {
      recordError('delete_upload_api', 'No file URL provided');
      return NextResponse.json(
        { 
          error: 'File URL is required',
          success: false,
        },
        { status: 400 }
      );
    }
    
    console.log(`🗑️ [Delete API] Attempting to delete: ${fileUrl}`);
    
    // Verifica se l'URL sembra essere un Vercel Blob URL
    const isVercelBlobUrl = fileUrl.includes('blob.vercel-storage.com') || fileUrl.includes('.vercel.app/_vercel/blob/');
    if (!isVercelBlobUrl) {
      console.warn(`⚠️ [Delete API] URL non sembra essere un Vercel Blob URL: ${fileUrl}`);
      return NextResponse.json({
        success: false,
        error: 'URL non compatibile con Vercel Blob',
        details: 'L\'URL fornito non sembra provenire da Vercel Blob Storage',
      }, { status: 400 });
    }
    
    const credentialsStart = performance.now();
    // Ottieni il token Vercel Blob
    const blobToken = await getBlobToken();
    const credentialsTime = performance.now() - credentialsStart;
    console.log(`🔑 [TIMING] Delete credentials: ${credentialsTime.toFixed(2)}ms`);
    
    if (!blobToken) {
      throw new Error('Vercel Blob token not available');
    }
    
    const deleteStart = performance.now();
    
    try {
      // Cancella il file dal blob storage
      await del(fileUrl, {
        token: blobToken,
      });
      
      const deleteTime = performance.now() - deleteStart;
      console.log(`🗑️ [TIMING] Blob delete: ${deleteTime.toFixed(2)}ms`);
      
    } catch (delError) {
      const deleteTime = performance.now() - deleteStart;
      console.warn(`⚠️ [Delete API] Vercel Blob delete failed in ${deleteTime.toFixed(2)}ms:`, delError);
      
      // Determina se l'errore è critico o meno
      const errorMessage = delError instanceof Error ? delError.message : 'Unknown delete error';
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        console.log(`📄 [Delete API] File non trovato (già eliminato?): ${fileUrl}`);
        // Consideriamo questo come un successo dato che il file non esiste più
      } else {
        // Errore più serio, lo rilanciamo
        throw delError;
      }
    }
    
    const totalTime = performance.now() - requestStart;
    
    // 📈 Record performance metrics
    recordApiLatency('delete_upload_api', totalTime, false);
    
    console.log(`✅ [Delete API] Successfully deleted file in ${totalTime.toFixed(2)}ms`);
    
    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      _timing: {
        total: Math.round(totalTime),
        credentials: Math.round(credentialsTime),
        delete: Math.round(deleteTime),
      }
    });
  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 📈 Record error metrics
    recordError('delete_upload_api', errorMessage);
    recordApiLatency('delete_upload_api', totalTime, false);
    
    console.error(`❌ [Delete API] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete file',
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
