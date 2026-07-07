'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { usePWA } from '@/components/PWAProvider';
import { 
  Trophy, 
  LayoutDashboard, 
  ListOrdered, 
  Swords, 
  Settings, 
  LogOut, 
  Download, 
  WifiOff,
  X
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
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAdmin(session?.user?.email === 'ged.venegas@gmail.com');
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAdmin(session?.user?.email === 'ged.venegas@gmail.com');
      
      // If signed out and not already on the login page, redirect to home
      if (!session && pathname !== '/') {
        router.push('/');
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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

  // If no user is logged in, hide navigation links
  if (!user) return null;

  return (
    <header className="glass" style={{ borderBottom: '1px solid var(--border-color)', top: 0, zIndex: 100, position: 'sticky' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1.5rem' }}>
        {/* Brand logo & title */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>
          <Trophy size={24} color="var(--primary)" style={{ filter: 'drop-shadow(var(--glow-shadow))' }} />
          <span>FC <span style={{ color: 'var(--primary)' }}>CHAMP</span></span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link 
            href="/dashboard" 
            className={`btn ${pathname === '/dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            <LayoutDashboard size={16} />
            <span className="nav-text">Dashboard</span>
          </Link>
          
          <Link 
            href="/leaderboard" 
            className={`btn ${pathname === '/leaderboard' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            <ListOrdered size={16} />
            <span className="nav-text">Leaderboard</span>
          </Link>
          
          <Link 
            href="/matches" 
            className={`btn ${pathname === '/matches' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            <Swords size={16} />
            <span className="nav-text">Matches</span>
          </Link>

          {isAdmin && (
            <Link 
              href="/admin" 
              className={`btn ${pathname === '/admin' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              <Settings size={16} />
              <span className="nav-text">Admin</span>
            </Link>
          )}
        </nav>

        {/* User Info, Install PWA and Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isOffline && (
            <div className="badge badge-pending" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <WifiOff size={12} />
              <span>Offline</span>
            </div>
          )}

          {!isStandalone && (isInstallable || isIosInstallable) && (
            <button 
              onClick={handleInstallClick} 
              className="btn btn-accent"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              title="Add to Home Screen"
            >
              <Download size={16} />
              <span className="nav-text">Add to Home Screen</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="nav-text" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {user.email}
            </span>
            <button 
              onClick={handleSignOut} 
              className="btn btn-secondary"
              style={{ padding: '0.5rem', borderRadius: '50%' }}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {showInstallHelp && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Add to Home Screen</h3>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.4rem', borderRadius: '50%' }}
                onClick={() => setShowInstallHelp(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '0.95rem' }}>
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
      
      <style jsx global>{`
        @media (max-width: 640px) {
          .nav-text {
            display: none;
          }
          header .container {
            padding: 0.5rem 1rem !important;
          }
        }
      `}</style>
    </header>
  );
}
