'use client';

import { useEffect } from 'react';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('[Dukan] Service Worker registered:', registration);
        },
        (error) => {
          console.error('[Dukan] Service Worker registration failed:', error);
        }
      );
    }
  }, []);

  return <>{children}</>;
}
