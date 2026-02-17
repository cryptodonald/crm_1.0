'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';

// ─── Zone Definitions ───────────────────────────────────────────────────────
// Normalized Y: 0 = feet, 1 = head top

interface ZoneDef {
  yMin: number;
  yMax: number;
  xMin?: number; // min xDist from center (0=center, 1=edge)
  xMax?: number; // max xDist from center
}

const ZONE_DEFS: Record<string, ZoneDef> = {
  lower_back: { yMin: 0.56, yMax: 0.66 },
  upper_back: { yMin: 0.62, yMax: 0.76 },
  neck_scapulae: { yMin: 0.74, yMax: 0.86, xMax: 0.35 },
  shoulders:  { yMin: 0.73, yMax: 0.82, xMin: 0.18, xMax: 0.72 },
  hips:       { yMin: 0.47, yMax: 0.56, xMin: 0.18, xMax: 0.65 },
  legs:       { yMin: 0.06, yMax: 0.44, xMax: 0.65 },
  neck:       { yMin: 0.84, yMax: 0.90 },
  full_torso: { yMin: 0.44, yMax: 0.84 },
};

// Health issue → which body zones to highlight
const HEALTH_ZONE_MAP: Record<string, string[]> = {
  lower_back_pain: ['lower_back'],
  shoulder_pain:   ['shoulders'],
  hip_pain:        ['hips'],
  lordosis:        ['lower_back'],
  kyphosis:        ['neck_scapulae'],
  fibromyalgia:    ['shoulders', 'upper_back', 'lower_back', 'hips', 'neck', 'legs'],
};

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ─── Wireframe Body Mesh ─────────────────────────────────────────────────────

function WireframeBody({
  url,
  highlightedZones = [],
}: {
  url: string;
  highlightedZones?: string[];
}) {
  const { scene } = useGLTF(url);

  const geometry = useMemo(() => {
    let srcGeo: THREE.BufferGeometry | null = null;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && !srcGeo) {
        srcGeo = (child.geometry as THREE.BufferGeometry).clone();
      }
    });

    if (!srcGeo) return null;
    const geo = srcGeo as THREE.BufferGeometry;

    geo.computeVertexNormals();
    geo.computeBoundingBox();

    const bbox = geo.boundingBox!;
    const yMin = bbox.min.y;
    const yRange = bbox.max.y - bbox.min.y;
    const xCenter = (bbox.min.x + bbox.max.x) / 2;
    const xHalf = (bbox.max.x - bbox.min.x) / 2;

    const positions = geo.getAttribute('position');

    // ── Vertex colors for zone highlighting ──
    const activeZones = new Set<string>();
    for (const issue of highlightedZones) {
      const zones = HEALTH_ZONE_MAP[issue];
      if (zones) zones.forEach((z) => activeZones.add(z));
    }

    const colors = new Float32Array(positions.count * 3);
    // Dark wireframe on light background
    const baseR = 0.28, baseG = 0.33, baseB = 0.42;
    // Highlight color (bright red)
    const hiR = 0.95, hiG = 0.10, hiB = 0.10;
    const falloff = 0.06;
    // Max X distance from center for torso (exclude arms)
    const torsoMaxX = 0.44;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const yNorm = (y - yMin) / yRange;
      const xDist = Math.abs(x - xCenter) / xHalf; // 0=center, 1=edge

      let weight = 0;

      for (const zoneName of activeZones) {
        const zone = ZONE_DEFS[zoneName];
        if (!zone) continue;

        // Per-zone X filter
        const zXMin = zone.xMin ?? 0;
        const zXMax = zone.xMax ?? torsoMaxX;
        if (xDist < zXMin || xDist > zXMax) continue;

        if (yNorm >= zone.yMin - falloff && yNorm <= zone.yMax + falloff) {
          const fadeIn = smoothstep(zone.yMin - falloff, zone.yMin + falloff, yNorm);
          const fadeOut = 1 - smoothstep(zone.yMax - falloff, zone.yMax + falloff, yNorm);
          // Fade at X edges
          const xFadeIn = smoothstep(zXMin, zXMin + 0.06, xDist);
          const xFadeOut = 1 - smoothstep(zXMax - 0.06, zXMax, xDist);
          const zoneWeight = Math.min(fadeIn, fadeOut) * Math.min(xFadeIn, xFadeOut);
          weight = Math.max(weight, zoneWeight);
        }
      }

      colors[i * 3]     = baseR + (hiR - baseR) * weight;
      colors[i * 3 + 1] = baseG + (hiG - baseG) * weight;
      colors[i * 3 + 2] = baseB + (hiB - baseB) * weight;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [scene, highlightedZones]);

  if (!geometry) return null;

  return (
    <Center>
      {/* Pass 1: depth-only occluder — hides back-side wireframe, visually invisible */}
      <mesh geometry={geometry} renderOrder={0}>
        <meshBasicMaterial
          colorWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
      {/* Pass 2: wireframe on top */}
      <mesh geometry={geometry} renderOrder={1}>
        <meshBasicMaterial
          vertexColors
          wireframe
          depthTest
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </Center>
  );
}

// ─── Loading Fallback ───────────────────────────────────────────────────────

function LoadingIndicator() {
  return (
    <mesh>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial color="#4488ff" wireframe />
    </mesh>
  );
}

// ─── Main Viewer ────────────────────────────────────────────────────────────

interface BodyModelViewerProps {
  glbUrl: string | null;
  showMesh?: boolean;
  highlightedZones?: string[];
  children?: React.ReactNode;
}

export function BodyModelViewer({
  glbUrl,
  showMesh = true,
  highlightedZones,
  children,
}: BodyModelViewerProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.5], fov: 45, near: 0.01, far: 100 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ background: '#f5f5f7' }}
    >
      <ambientLight intensity={0.5} />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={0.5}
        maxDistance={6}
        enablePan={false}
        target={[0, 0, 0]}
      />

      <Suspense fallback={<LoadingIndicator />}>
        {glbUrl && showMesh && (
          <WireframeBody url={glbUrl} highlightedZones={highlightedZones} />
        )}
      </Suspense>

      {children}
    </Canvas>
  );
}
