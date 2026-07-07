'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { usePWA } from '@/components/PWAProvider';
import {
  Settings,
  LogOut,
  Download,
  WifiOff,
  X,
} from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isInstallable, installApp, isOffline, isIosInstallable, isStandalone } = usePWA();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAdmin(session?.user?.email === 'ged.venegas@gmail.com');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAdmin(session?.user?.email === 'ged.venegas@gmail.com');

      if (!session && pathname !== '/') {
        router.push('/');
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase.auth, pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      await installApp();
      return;
    }

    setShowInstallHelp(true);
  };

  if (!user) return null;

  return (
    <header className="app-header glass">
      <div className="app-header-inner">
        <div className="app-header-side app-header-side-left">
          {isOffline && (
            <div className="badge badge-pending header-badge">
              <WifiOff size={12} />
              <span className="header-badge-text">Offline</span>
            </div>
          )}

          {!isStandalone && (isInstallable || isIosInstallable) && (
            <button
              onClick={handleInstallClick}
              className="btn btn-secondary header-icon-btn"
              title="Add to Home Screen"
              aria-label="Add to Home Screen"
            >
              <Download size={18} />
            </button>
          )}
        </div>

        <Link href="/dashboard" className="app-header-logo" aria-label="FC Champ Home">
          <Image
            src="/icons/logo.png"
            alt="FC Champ"
            width={330}
            height={104}
            priority
            className="app-header-logo-img"
          />
        </Link>

        <div className="app-header-side app-header-side-right">
          {isAdmin && (
            <Link
              href="/admin"
              className={`btn header-icon-btn ${pathname === '/admin' ? 'header-icon-btn-active' : 'btn-secondary'}`}
              title="Admin"
              aria-label="Admin"
            >
              <Settings size={18} />
            </Link>
          )}

          <button
            onClick={handleSignOut}
            className="btn btn-secondary header-icon-btn"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {showInstallHelp && (
        <div className="install-help-overlay">
          <div className="card glass install-help-modal">
            <div className="install-help-header">
              <h3>Add to Home Screen</h3>
              <button
                type="button"
                className="btn btn-secondary header-icon-btn"
                onClick={() => setShowInstallHelp(false)}
                title="Close"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <p>
              On iPhone, tap Share in Safari, then choose Add to Home Screen.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowInstallHelp(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
