import { NextRequest, NextResponse } from 'next/server';

/**
 * Body Model API Proxy
 *
 * Forwards requests to the Anny body model microservice.
 * Handles both GLB mesh and point cloud endpoints.
 */

const BODY_MODEL_SERVICE_URL = process.env.BODY_MODEL_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint = 'mesh', ...params } = body as {
      endpoint?: 'mesh' | 'pointcloud';
      [key: string]: unknown;
    };

    const targetUrl =
      endpoint === 'pointcloud'
        ? `${BODY_MODEL_SERVICE_URL}/api/body-model/pointcloud`
        : `${BODY_MODEL_SERVICE_URL}/api/body-model`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Body model service error: ${error}` },
        { status: response.status },
      );
    }

    if (endpoint === 'pointcloud') {
      // JSON response — pass through
      const data = await response.json();
      return NextResponse.json(data);
    }

    // GLB binary response
    const glbBuffer = await response.arrayBuffer();
    return new NextResponse(glbBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Cache-Control': 'public, max-age=300',
        'X-Cache': response.headers.get('X-Cache') || 'UNKNOWN',
      },
    });
  } catch (error) {
    console.error('[body-model] Proxy error:', error);
    return NextResponse.json(
      { error: 'Body model service unavailable' },
      { status: 503 },
    );
  }
}
