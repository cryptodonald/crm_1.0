'use client';

import dynamic from 'next/dynamic';

interface GLBViewerProps {
  url: string;
  highlightedZones?: string[];
}

// Lazy load Three.js only on client side to avoid SSR crashes
const Scene = dynamic(() => import('./GLBScene'), { ssr: false });

export function GLBViewer({ url, highlightedZones }: GLBViewerProps) {
  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden" style={{ background: '#f5f5f7' }}>
      <Scene url={url} highlightedZones={highlightedZones} />
    </div>
  );
}
