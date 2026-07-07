'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface PWAContextType {
  isInstallable: boolean;
  installApp: () => Promise<void>;
  isOffline: boolean;
}

const PWAContext = createContext<PWAContextType>({
  isInstallable: false,
  installApp: async () => {},
  isOffline: false,
});

export const usePWA = () => useContext(PWAContext);

export default function PWAProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('Service Worker registered:', reg.scope))
          .catch((err) =>
            console.error('Service Worker registration failed:', err)
          );
      });
    }

    // Handle online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Intercept PWA install prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener(
          'beforeinstallprompt',
          handleBeforeInstallPrompt
        );
      };
    }
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA installation outcome: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <PWAContext.Provider value={{ isInstallable, installApp, isOffline }}>
      {children}
    </PWAContext.Provider>
  );
}
