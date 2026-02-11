'use client';

/**
 * SWR Provider with localStorage persistence
 * Must be a Client Component to use localStorage
 */

import { SWRConfig } from 'swr';
import { localStorageProvider } from '@/lib/swr-storage';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: localStorageProvider,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
