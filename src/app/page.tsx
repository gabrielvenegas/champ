'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
    setSuccess(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
          },
        });

        if (signUpError) throw signUpError;
        
        // Supabase sends a verification email by default, notify user
        setSuccess('Check your email to confirm registration! After verifying, you can sign in.');
        setIsSignUp(false);
      } else {
        // Sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
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

        {/* Tab Selector */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          background: 'rgba(0, 0, 0, 0.3)', 
          padding: '0.25rem', 
          borderRadius: 'var(--border-radius-sm)',
          marginBottom: '1.5rem'
        }}>
          <button 
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); setSuccess(null); }}
            className={`btn ${!isSignUp ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem', borderRadius: 'calc(var(--border-radius-sm) - 2px)', fontSize: '0.9rem', boxShadow: !isSignUp ? 'var(--glow-shadow)' : 'none' }}
          >
            Sign In
          </button>
          <button 
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); setSuccess(null); }}
            className={`btn ${isSignUp ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem', borderRadius: 'calc(var(--border-radius-sm) - 2px)', fontSize: '0.9rem', boxShadow: isSignUp ? 'var(--glow-shadow)' : 'none' }}
          >
            Sign Up
          </button>
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

        {success && (
          <div className="badge badge-success" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            width: '100%', 
            borderRadius: 'var(--border-radius-sm)',
            padding: '0.75rem',
            marginBottom: '1.25rem',
            textTransform: 'none',
            fontSize: '0.85rem'
          }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth}>
          {isSignUp && (
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Gabriel"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="email" 
                required
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Admin email: <span style={{ color: 'var(--secondary)' }}>ged.venegas@gmail.com</span>
        </div>
      </div>
    </div>
  );
}
