'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface PWAContextType {
  isInstallable: boolean;
  installApp: () => Promise<void>;
  isOffline: boolean;
  isIosInstallable: boolean;
  isStandalone: boolean;
}

const getInitialOfflineState = () =>
  typeof navigator !== 'undefined' ? !navigator.onLine : false;

const getInitialStandaloneState = () => {
  if (typeof window === 'undefined') return false;

  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
};

const getInitialIosInstallableState = () => {
  if (typeof window === 'undefined') return false;

  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  return isIos && !getInitialStandaloneState();
};

const PWAContext = createContext<PWAContextType>({
  isInstallable: false,
  installApp: async () => {},
  isOffline: false,
  isIosInstallable: false,
  isStandalone: false,
});

export const usePWA = () => useContext(PWAContext);

export default function PWAProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOffline, setIsOffline] = useState(getInitialOfflineState);
  const [isIosInstallable] = useState(getInitialIosInstallableState);
  const [isStandalone] = useState(getInitialStandaloneState);

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
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Intercept PWA install prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
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
    <PWAContext.Provider value={{ isInstallable, installApp, isOffline, isIosInstallable, isStandalone }}>
      {children}
    </PWAContext.Provider>
  );
}
