/**
 * 3D File Parsers
 * 
 * Parse common 3D file formats (.obj, .ply, .glb) and extract point clouds
 * for Anny body model fitting.
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ParsedMesh {
  vertices: Point3D[];
  faces?: number[][];
  format: 'obj' | 'ply' | 'glb' | 'xyz';
}

/**
 * Parse Wavefront OBJ file (most common from iPhone apps)
 */
export function parseOBJ(fileContent: string): ParsedMesh {
  const vertices: Point3D[] = [];
  const faces: number[][] = [];
  
  const lines = fileContent.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Parse vertex: v x y z
    if (trimmed.startsWith('v ')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        vertices.push({
          x: parseFloat(parts[1]),
          y: parseFloat(parts[2]),
          z: parseFloat(parts[3]),
        });
      }
    }
    
    // Parse face: f v1 v2 v3 (optional, for mesh topology)
    else if (trimmed.startsWith('f ')) {
      const parts = trimmed.split(/\s+/).slice(1);
      const faceIndices = parts.map(p => {
        // Handle format: v/vt/vn or v/vt or v
        const idx = parseInt(p.split('/')[0]);
        return idx - 1; // OBJ indices are 1-based
      });
      if (faceIndices.length >= 3) {
        faces.push(faceIndices);
      }
    }
  }
  
  return { vertices, faces: faces.length > 0 ? faces : undefined, format: 'obj' };
}

/**
 * Parse Stanford PLY file (ASCII format)
 */
export function parsePLY(fileContent: string): ParsedMesh {
  const vertices: Point3D[] = [];
  const lines = fileContent.split('\n');
  
  let headerEnded = false;
  let vertexCount = 0;
  let currentVertex = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Parse header
    if (!headerEnded) {
      if (trimmed.startsWith('element vertex')) {
        vertexCount = parseInt(trimmed.split(/\s+/)[2]);
      } else if (trimmed === 'end_header') {
        headerEnded = true;
      }
      continue;
    }
    
    // Parse vertex data
    if (currentVertex < vertexCount) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 3) {
        vertices.push({
          x: parseFloat(parts[0]),
          y: parseFloat(parts[1]),
          z: parseFloat(parts[2]),
        });
        currentVertex++;
      }
    }
  }
  
  return { vertices, format: 'ply' };
}

/**
 * Parse simple XYZ point cloud (space/comma separated)
 */
export function parseXYZ(fileContent: string): ParsedMesh {
  const vertices: Point3D[] = [];
  const lines = fileContent.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const parts = trimmed.split(/[\s,]+/);
    if (parts.length >= 3) {
      vertices.push({
        x: parseFloat(parts[0]),
        y: parseFloat(parts[1]),
        z: parseFloat(parts[2]),
      });
    }
  }
  
  return { vertices, format: 'xyz' };
}

/**
 * Sample points uniformly from mesh
 * If input has too many points, downsample. If too few, upsample.
 */
export function samplePoints(
  mesh: ParsedMesh,
  targetCount: number = 5000
): Point3D[] {
  const { vertices } = mesh;
  
  if (vertices.length === 0) {
    throw new Error('No vertices found in mesh');
  }
  
  // If already close to target, return as-is
  if (Math.abs(vertices.length - targetCount) < targetCount * 0.1) {
    return vertices;
  }
  
  // Downsample: select evenly spaced points
  if (vertices.length > targetCount) {
    const step = vertices.length / targetCount;
    const sampled: Point3D[] = [];
    for (let i = 0; i < targetCount; i++) {
      const idx = Math.floor(i * step);
      sampled.push(vertices[idx]);
    }
    return sampled;
  }
  
  // Upsample: duplicate existing points with small jitter
  const upsampled: Point3D[] = [...vertices];
  const needed = targetCount - vertices.length;
  const jitterScale = 0.001; // 1mm jitter
  
  for (let i = 0; i < needed; i++) {
    const original = vertices[i % vertices.length];
    upsampled.push({
      x: original.x + (Math.random() - 0.5) * jitterScale,
      y: original.y + (Math.random() - 0.5) * jitterScale,
      z: original.z + (Math.random() - 0.5) * jitterScale,
    });
  }
  
  return upsampled;
}

/**
 * Convert Point3D array to format expected by Railway API
 */
export function pointsToArray(points: Point3D[]): number[][] {
  return points.map(p => [p.x, p.y, p.z]);
}

/**
 * Auto-detect format and parse
 */
export function parseAuto(fileContent: string, filename: string): ParsedMesh {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'obj':
      return parseOBJ(fileContent);
    case 'ply':
      return parsePLY(fileContent);
    case 'xyz':
    case 'txt':
      return parseXYZ(fileContent);
    default:
      // Try to auto-detect from content
      if (fileContent.includes('ply') && fileContent.includes('end_header')) {
        return parsePLY(fileContent);
      } else if (fileContent.includes('v ') && fileContent.includes('f ')) {
        return parseOBJ(fileContent);
      } else {
        // Fallback to XYZ
        return parseXYZ(fileContent);
      }
  }
}

/**
 * Validate mesh has reasonable dimensions (0.5m - 2.5m height)
 */
export function validateMesh(mesh: ParsedMesh): { valid: boolean; error?: string } {
  if (mesh.vertices.length < 100) {
    return { valid: false, error: 'Too few points (minimum 100)' };
  }
  
  if (mesh.vertices.length > 100000) {
    return { valid: false, error: 'Too many points (maximum 100,000)' };
  }
  
  // Check bounding box
  const xs = mesh.vertices.map(v => v.x);
  const ys = mesh.vertices.map(v => v.y);
  const zs = mesh.vertices.map(v => v.z);
  
  const width = Math.max(...xs) - Math.min(...xs);
  const depth = Math.max(...ys) - Math.min(...ys);
  const height = Math.max(...zs) - Math.min(...zs);
  
  // Assuming Y-up: height should be the largest dimension
  const maxDim = Math.max(width, depth, height);
  const minDim = Math.min(width, depth, height);
  
  if (maxDim < 0.5 || maxDim > 2.5) {
    return { 
      valid: false, 
      error: `Invalid dimensions: ${maxDim.toFixed(2)}m (expected 0.5-2.5m for human body)` 
    };
  }
  
  if (minDim < 0.1) {
    return { 
      valid: false, 
      error: `Mesh too flat: ${minDim.toFixed(2)}m minimum dimension` 
    };
  }
  
  return { valid: true };
}
