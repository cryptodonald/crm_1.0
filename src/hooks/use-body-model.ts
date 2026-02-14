'use client';

import useSWR from 'swr';
import { useRef, useEffect, useState } from 'react';
import type { BodyModelParams, PointCloudResponse } from '@/types/body-model';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a stable cache key from params */
function buildKey(prefix: string, params: BodyModelParams): string {
  const base = `${prefix}:g=${params.gender}:h=${params.height_cm}:w=${params.weight_kg}:bt=${params.body_type}:p=${params.pose}`;
  if (params.zone_overrides) {
    const zo = Object.entries(params.zone_overrides)
      .filter(([, v]) => v !== 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return zo ? `${base}:zo=${zo}` : base;
  }
  return base;
}

/** Fetcher for GLB binary — returns object URL */
async function glbFetcher(params: BodyModelParams): Promise<string> {
  const response = await fetch('/api/body-model', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: 'mesh', ...params }),
  });

  if (!response.ok) {
    throw new Error(`GLB fetch failed: ${response.status}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/** Fetcher for point cloud JSON */
async function pointcloudFetcher(
  params: BodyModelParams,
): Promise<PointCloudResponse> {
  const response = await fetch('/api/body-model', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: 'pointcloud', ...params }),
  });

  if (!response.ok) {
    throw new Error(`Point cloud fetch failed: ${response.status}`);
  }

  return response.json();
}

// ─── Debounce hook ──────────────────────────────────────────────────────────

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Fetch the Anny body model as a GLB blob URL.
 * Automatically debounces param changes by 300ms.
 */
export function useBodyModel(params: BodyModelParams | null) {
  const debouncedParams = useDebounced(params, 300);
  const prevUrlRef = useRef<string | null>(null);

  const key = debouncedParams ? buildKey('glb', debouncedParams) : null;

  const { data, error, isLoading } = useSWR(
    key ? [key, debouncedParams] : null,
    ([, p]) => glbFetcher(p as BodyModelParams),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    },
  );

  // Revoke old blob URL when a new one arrives
  useEffect(() => {
    if (data && prevUrlRef.current && prevUrlRef.current !== data) {
      URL.revokeObjectURL(prevUrlRef.current);
    }
    prevUrlRef.current = data ?? null;
  }, [data]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
  }, []);

  return {
    glbUrl: data ?? null,
    isLoading,
    error: error as Error | undefined,
  };
}

/**
 * Fetch the dense point cloud for body model.
 * Automatically debounces param changes by 300ms.
 */
export function usePointCloud(params: BodyModelParams | null) {
  const debouncedParams = useDebounced(params, 300);

  const key = debouncedParams ? buildKey('pc', debouncedParams) : null;

  const { data, error, isLoading } = useSWR(
    key ? [key, debouncedParams] : null,
    ([, p]) => pointcloudFetcher(p as BodyModelParams),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    },
  );

  return {
    pointCloud: data ?? null,
    isLoading,
    error: error as Error | undefined,
  };
}
