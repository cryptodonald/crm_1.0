'use client';

import dynamic from 'next/dynamic';

// Dynamic import — Three.js cannot run in SSR
const BodyModelPanel = dynamic(
  () =>
    import('@/components/body-model/BodyModelPanel').then(
      (mod) => mod.BodyModelPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[600px] text-muted-foreground">
        Caricamento viewer 3D...
      </div>
    ),
  },
);

export default function DemoBodyModelPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Body Model — Point Cloud Demo
          </h1>
          <p className="text-sm text-muted-foreground">
            Modello Anny parametrizzato con point cloud densa (50K punti) e
            regolazione manuale zone corporee.
          </p>
        </div>

        {/* Body Model Panel */}
        <BodyModelPanel
          initialParams={{
            height_cm: 175,
            weight_kg: 75,
            gender: 'male',
            body_type: 'average',
            pose: 'standing',
          }}
        />
      </div>
    </div>
  );
}
