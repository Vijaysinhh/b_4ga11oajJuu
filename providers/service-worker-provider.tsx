'use client';

import { useEffect } from 'react';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      }).catch((error) => {
        console.warn('[Dukan] Failed to unregister development service worker:', error);
      });
      return;
    }

    navigator.serviceWorker.register('/sw.js').then(
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
