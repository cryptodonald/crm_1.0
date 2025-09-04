import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getBlobToken } from '@/lib/api-keys-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validazione del file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File troppo grande (max 10MB)' },
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
      return NextResponse.json(
        { error: 'Tipo di file non supportato' },
        { status: 400 }
      );
    }

    // Ottieni il token Vercel Blob
    const blobToken = await getBlobToken();
    if (!blobToken) {
      return NextResponse.json(
        { error: 'Vercel Blob token not available' },
        { status: 500 }
      );
    }

    console.log('🔄 [BLOB UPLOAD] Starting upload for:', file.name);

    // Genera un nome file univoco
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `leads/${timestamp}-${cleanFileName}`;

    // Carica il file su Vercel Blob
    const blob = await put(uniqueFileName, file, {
      access: 'public',
      token: blobToken,
    });

    console.log('✅ [BLOB UPLOAD] Success:', blob.url);

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

    return NextResponse.json({
      success: true,
      attachment: airtableAttachment,
    });
  } catch (error) {
    console.error('❌ [BLOB UPLOAD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
