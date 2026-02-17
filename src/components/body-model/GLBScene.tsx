'use client';

import { BodyModelViewer } from './BodyModelViewer';

export default function GLBScene({
  url,
  highlightedZones,
}: {
  url: string;
  highlightedZones?: string[];
}) {
  return <BodyModelViewer glbUrl={url} highlightedZones={highlightedZones} />;
}
