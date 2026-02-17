import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { put } from '@vercel/blob';
import { query } from '@/lib/postgres';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { parseAuto, samplePoints, pointsToArray, validateMesh } from '@/lib/3d-parsers';

const RAILWAY_API_URL = process.env.BODY_MODEL_SERVICE_URL || 'https://doctorbed-body-model-production.up.railway.app';
// Next.js 16 has a hardcoded 10MB limit for formData() in Route Handlers
// See: https://github.com/vercel/next.js/issues/58336
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (Next.js limit)

export async function POST(request: NextRequest) {
  try {
    // Check authentication (NextAuth session)
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse multipart form data with error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error('[Scan Upload] FormData parse error:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse upload. File may be too large or corrupted.' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File;
    const clienteId = formData.get('cliente_id') as string;
    const initialGender = formData.get('initial_gender') as string || 'neutral';
    const initialAgeYears = parseInt(formData.get('initial_age_years') as string || '40');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!clienteId) {
      return NextResponse.json(
        { error: 'cliente_id is required' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedExtensions = ['.obj', '.ply', '.xyz', '.txt', '.stl'];
    const filename = file.name.toLowerCase();
    const hasValidExt = allowedExtensions.some(ext => filename.endsWith(ext));
    
    if (!hasValidExt) {
      return NextResponse.json(
        { error: `Invalid file type. Supported: ${allowedExtensions.join(', ')}` },
        { status: 400 }
      );
    }

    console.log(`[Scan Upload] Processing ${file.name} (${(file.size / 1024).toFixed(1)}KB) for cliente ${clienteId}`);

    // Read file content
    const fileContent = await file.text();

    // Parse 3D file
    let mesh;
    try {
      mesh = parseAuto(fileContent, file.name);
      console.log(`[Scan Upload] Parsed ${mesh.format} file: ${mesh.vertices.length} vertices`);
    } catch (error) {
      console.error('[Scan Upload] Parse error:', error);
      return NextResponse.json(
        { error: 'Failed to parse 3D file. Please check file format.' },
        { status: 400 }
      );
    }

    // Validate mesh
    const validation = validateMesh(mesh);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Invalid mesh: ${validation.error}` },
        { status: 400 }
      );
    }

    // Sample points for fitting
    const sampledPoints = samplePoints(mesh, 5000);
    const pointsArray = pointsToArray(sampledPoints);
    
    console.log(`[Scan Upload] Sampled ${pointsArray.length} points for fitting`);

    // Call Railway fitting endpoint
    const railwayUrl = `${RAILWAY_API_URL}/api/body-model/fit`;
    console.log(`[Scan Upload] Calling Railway: ${railwayUrl}`);
    
    const fitResponse = await fetch(railwayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: pointsArray,
        initial_gender: initialGender,
        initial_age_years: initialAgeYears,
        max_iterations: 5,
      }),
    });

    if (!fitResponse.ok) {
      const errorText = await fitResponse.text();
      console.error('[Scan Upload] Railway fit failed:', errorText);
      return NextResponse.json(
        { error: `Fitting failed: ${errorText.substring(0, 200)}` },
        { status: 500 }
      );
    }

    const fitResult = await fitResponse.json();
    console.log(`[Scan Upload] Fitting complete: ${fitResult.error_mm.toFixed(1)}mm error`);

    // Decode GLB from base64
    const glbBuffer = Buffer.from(fitResult.glb, 'base64');
    const glbFilename = `body-scans/${clienteId}-${Date.now()}.glb`;

    // Upload GLB to Vercel Blob Storage
    const blob = await put(glbFilename, glbBuffer, {
      access: 'public',
      contentType: 'model/gltf-binary',
    });

    console.log(`[Scan Upload] GLB uploaded: ${blob.url}`);

    // Save to database
    const bodyScanRows = await query<{ id: string }>(
      `INSERT INTO body_scans (
        cliente_id,
        phenotypes,
        glb_url,
        error_mm,
        scan_type,
        metadata,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id`,
      [
        clienteId,
        JSON.stringify(fitResult.phenotypes),
        blob.url,
        fitResult.error_mm,
        '3d_scan',
        JSON.stringify({
          original_filename: file.name,
          original_format: mesh.format,
          num_points: mesh.vertices.length,
          sampled_points: pointsArray.length,
          num_iterations: fitResult.num_iterations,
        }),
      ]
    );

    if (!bodyScanRows || bodyScanRows.length === 0) {
      console.error('[Scan Upload] Database insert failed');
      return NextResponse.json(
        { error: 'Database error: Failed to save body scan' },
        { status: 500 }
      );
    }

    const bodyScan = bodyScanRows[0];

    // Update lead with latest body scan reference
    await query(
      'UPDATE leads SET latest_body_scan_id = $1, updated_at = NOW() WHERE id = $2',
      [bodyScan.id, clienteId]
    );

    console.log(`[Scan Upload] Success! Body scan ${bodyScan.id} saved`);

    return NextResponse.json({
      success: true,
      body_scan_id: bodyScan.id,
      phenotypes: fitResult.phenotypes,
      glb_url: blob.url,
      error_mm: fitResult.error_mm,
    });

  } catch (error) {
    console.error('[Scan Upload] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Route segment config for large file uploads
export const runtime = 'nodejs';
export const maxDuration = 60; // 60s timeout for scan processing

// This is a Next.js 16 workaround for body size limit
// The actual limit is enforced by formData() parsing
// For files > 10MB, we need to use a different approach
