import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import jwt from 'jsonwebtoken';

// Configurazioni per upload
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Estrae info utente dal token JWT
 */
function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    throw new Error('Token mancante');
  }
  
  try {
    // Importiamo verifyToken per decodificare il JWT
    const { verifyToken } = require('@/lib/auth');
    
    const payload = verifyToken(token);
    
    if (!payload) {
      throw new Error('Token non valido o scaduto');
    }
    
    return { 
      userId: payload.userId, 
      email: payload.email,
      nome: payload.nome
    };
  } catch (error) {
    throw new Error('Token non valido');
  }
}

/**
 * Genera nome file univoco per avatar
 */
function generateFileName(userId: string, originalName: string): string {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  return `${userId}-${timestamp}.${extension}`;
}

/**
 * Valida file upload
 */
function validateFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Tipo file non supportato. Usa JPG, PNG o WebP');
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File troppo grande. Massimo 5MB');
  }
}

/**
 * POST - Upload avatar utente
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📸 [AVATAR] Processing avatar upload to Vercel Blob...');
    
    // Verifica autenticazione
    const user = getUserFromToken(request);
    
    // Leggi form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'Nessun file caricato'
      }, { status: 400 });
    }
    
    // Valida file
    validateFile(file);
    
    // Genera nome file per Blob
    const fileName = generateFileName(user.userId, file.name);
    const blobPath = `avatars/${fileName}`;
    
    // Upload a Vercel Blob
    const blob = await put(blobPath, file, {
      access: 'public',
      addRandomSuffix: false, // Usiamo il nostro nome file
    });
    
    console.log(`✅ [AVATAR] Avatar uploaded to Blob: ${blob.url}`);
    
    return NextResponse.json({
      success: true,
      message: 'Avatar caricato con successo',
      avatarUrl: blob.url
    });
    
  } catch (error) {
    console.error('❌ [AVATAR] Upload error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Errore upload avatar';
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * DELETE - Rimuovi avatar utente
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [AVATAR] Processing avatar deletion from Blob...');
    
    const user = getUserFromToken(request);
    const { searchParams } = new URL(request.url);
    const avatarUrl = searchParams.get('url');
    
    console.log('🔍 [AVATAR] Received URL to delete:', avatarUrl);
    
    if (avatarUrl) {
      // Controlla se l'URL è di Vercel Blob prima di provare a cancellare
      const isVercelBlobUrl = avatarUrl.includes('.public.blob.vercel-storage.com');
      
      if (isVercelBlobUrl) {
        // Rimuovi da Vercel Blob solo se è davvero un URL di Vercel Blob
        try {
          console.log('🗑️ [AVATAR] Attempting to delete from Vercel Blob:', avatarUrl);
          await del(avatarUrl);
          console.log(`✅ [AVATAR] Avatar deleted from Vercel Blob: ${avatarUrl}`);
        } catch (blobError) {
          console.error('❌ [AVATAR] Error deleting from Vercel Blob:', blobError);
          // Non bloccare l'operazione se la cancellazione da Blob fallisce
        }
      } else {
        console.log('📷 [AVATAR] URL is not a Vercel Blob URL (probably Airtable converted it). Skipping Blob deletion.');
        console.log('🔗 [AVATAR] URL type:', avatarUrl.split('/')[2]); // Mostra il dominio
      }
    } else {
      console.warn('⚠️ [AVATAR] No URL provided for deletion');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Avatar rimosso con successo'
    });
    
  } catch (error) {
    console.error('❌ [AVATAR] Delete error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore rimozione avatar'
    }, { status: 500 });
  }
}
