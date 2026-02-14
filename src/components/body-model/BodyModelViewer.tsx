'use client';

import { Suspense, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';

// ─── GLB Body Mesh ──────────────────────────────────────────────────────────

function BodyMesh({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const meshRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // Apply semi-transparent material for when point cloud is overlaid
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0xd4c4b0,
          roughness: 0.6,
          metalness: 0.05,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
      }
    });
  }, [scene]);

  return (
    <Center>
      <primitive ref={meshRef} object={scene} />
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
  children?: React.ReactNode;
}

export function BodyModelViewer({
  glbUrl,
  showMesh = true,
  children,
}: BodyModelViewerProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.5], fov: 45, near: 0.01, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: '#0a0e1a' }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 3]} intensity={0.8} />
      <directionalLight position={[-3, 2, -3]} intensity={0.3} />

      {/* Grid plane (subtle) */}
      <gridHelper
        args={[4, 20, '#1a2040', '#141830']}
        position={[0, -1.2, 0]}
      />

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={0.5}
        maxDistance={6}
        enablePan
        target={[0, 0, 0]}
      />

      {/* Body Mesh */}
      <Suspense fallback={<LoadingIndicator />}>
        {glbUrl && showMesh && <BodyMesh url={glbUrl} />}
      </Suspense>

      {/* Children (point cloud overlay, etc.) */}
      {children}
    </Canvas>
  );
}
