'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Lock, User, AlertCircle } from 'lucide-react';

const PLAYER_LOGIN_DOMAIN = 'champ-lovat.vercel.app';

const getAuthEmail = (login: string) => {
  const normalizedLogin = login.trim().toLowerCase();
  return normalizedLogin.includes('@')
    ? normalizedLogin
    : `${normalizedLogin}@${PLAYER_LOGIN_DOMAIN}`;
};

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard');
        router.refresh();
      }
    });
  }, [router, supabase.auth]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: getAuthEmail(login),
        password,
      });

      if (signInError) throw signInError;
      
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '1.5rem',
      position: 'relative'
    }}>
      <div className="card glass animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            display: 'inline-flex', 
            padding: '1rem', 
            borderRadius: '50%', 
            background: 'rgba(0, 255, 102, 0.05)', 
            border: '1px solid rgba(0, 255, 102, 0.1)',
            marginBottom: '1rem',
            boxShadow: 'var(--glow-shadow)'
          }}>
            <Trophy size={40} color="var(--primary)" />
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
            FC <span style={{ color: 'var(--primary)' }}>CHAMP</span>
          </h1>
          <p style={{ fontSize: '0.9rem' }}>
            Friends EA FC Championship PWA
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="badge badge-pending" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            width: '100%', 
            borderRadius: 'var(--border-radius-sm)',
            padding: '0.75rem',
            marginBottom: '1.25rem',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            textTransform: 'none',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label className="form-label">Login</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                required
                placeholder="your login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem' }}
          >
            {loading ? 'Processing...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Admin email: <span style={{ color: 'var(--secondary)' }}>ged.venegas@gmail.com</span>
        </div>
      </div>
    </div>
  );
}
