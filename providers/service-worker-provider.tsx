'use client';

import { useEffect } from 'react';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const workerUrl = process.env.NODE_ENV === 'production' ? '/sw.js' : '/sw.js?dev=1';
    navigator.serviceWorker.register(workerUrl, { updateViaCache: 'none' }).then(
      (registration) => {
        console.log('[Dukan] Service Worker registered:', registration);
      },
      (error) => {
        console.error('[Dukan] Service Worker registration failed:', error);
      }
    );
  }, []);

  return <>{children}</>;
}
