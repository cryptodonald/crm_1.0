'use client';

import { useMemo } from 'react';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { PointCloudResponse } from '@/types/body-model';

/**
 * Blue neural gradient scale.
 *
 * Maps a [0,1] intensity to a blue tone:
 *   0.0 → deep navy   (#0a1128)
 *   0.3 → dark blue    (#1a3a6e)
 *   0.5 → royal blue   (#2563eb)
 *   0.7 → bright blue  (#3b82f6)
 *   1.0 → light cyan   (#7dd3fc)
 */
function blueGradient(t: number): [number, number, number] {
  // Clamp
  const v = Math.max(0, Math.min(1, t));

  // Interpolate through blue stops
  const r = 0.04 + v * 0.45;
  const g = 0.07 + v * 0.75;
  const b = 0.16 + v * 0.83;

  return [
    Math.min(1, r * 0.6),
    Math.min(1, g * 0.85),
    Math.min(1, b),
  ];
}

interface PointCloudOverlayProps {
  pointCloud: PointCloudResponse;
  pointSize?: number;
  opacity?: number;
  visible?: boolean;
}

export function PointCloudOverlay({
  pointCloud,
  pointSize = 1.8,
  opacity = 0.85,
  visible = true,
}: PointCloudOverlayProps) {
  const { positions, colors } = useMemo(() => {
    const numPoints = pointCloud.positions.length;
    const posArray = new Float32Array(numPoints * 3);
    const colorArray = new Float32Array(numPoints * 3);

    // Find Y range for normalization (height-based gradient)
    let yMin = Infinity;
    let yMax = -Infinity;
    for (let i = 0; i < numPoints; i++) {
      const y = pointCloud.positions[i][1];
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
    const yRange = yMax - yMin || 1;

    // Find mass range for intensity modulation
    let massMax = 0;
    for (let i = 0; i < numPoints; i++) {
      if (pointCloud.mass_fractions[i] > massMax) {
        massMax = pointCloud.mass_fractions[i];
      }
    }
    const massScale = massMax || 1;

    for (let i = 0; i < numPoints; i++) {
      const [x, y, z] = pointCloud.positions[i];
      posArray[i * 3] = x;
      posArray[i * 3 + 1] = y;
      posArray[i * 3 + 2] = z;

      // Intensity based on: Y position (height) + mass fraction
      // Higher mass zones → brighter/lighter blue
      // Creates a dynamic neural-map feel
      const yNorm = (y - yMin) / yRange; // 0=bottom, 1=top
      const massNorm = pointCloud.mass_fractions[i] / massScale;

      // Blend: 40% height gradient + 60% mass intensity
      const intensity = yNorm * 0.4 + massNorm * 0.6;

      const [r, g, b] = blueGradient(intensity);
      colorArray[i * 3] = r;
      colorArray[i * 3 + 1] = g;
      colorArray[i * 3 + 2] = b;
    }

    return {
      positions: posArray,
      colors: colorArray,
    };
  }, [pointCloud]);

  if (!visible) return null;

  return (
    <Points positions={positions} colors={colors} stride={3}>
      <PointMaterial
        vertexColors
        size={pointSize}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}
