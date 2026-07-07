'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateRoundRobin } from '@/lib/utils/scheduler';
import { 
  Trophy, 
  UserPlus, 
  Settings, 
  Users, 
  Play, 
  Trash2, 
  Check, 
  AlertCircle,
  Activity
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Active championship state
  const [activeChampionship, setActiveChampionship] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);

  // Player state
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [playerActionLoading, setPlayerActionLoading] = useState(false);

  // New Championship creation state
  const [newChampName, setNewChampName] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [champCreationLoading, setChampCreationLoading] = useState(false);

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== 'ged.venegas@gmail.com') {
        router.push('/');
        return;
      }
      setIsAdmin(true);
      await loadAdminData();
    } catch (err) {
      console.error('Error verifying admin access:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      // 1. Fetch all players
      const { data: playersData, error: playersErr } = await supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true });
      if (playersErr) throw playersErr;
      setAllPlayers(playersData || []);

      // 2. Fetch active championship
      const { data: champData, error: champErr } = await supabase
        .from('championships')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (champErr) throw champErr;

      setActiveChampionship(champData);

      // 3. Fetch matches for active championship
      if (champData) {
        const { data: matchesData } = await supabase
          .from('matches')
          .select('id, status')
          .eq('championship_id', champData.id);
        setMatches(matchesData || []);
      } else {
        setMatches([]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading dashboard records.');
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setPlayerActionLoading(true);

    try {
      const payload: any = { name: newPlayerName };
      if (newPlayerEmail.trim()) {
        payload.email = newPlayerEmail.trim().toLowerCase();
        
        // Check if user already exists in profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', payload.email)
          .maybeSingle();
        
        if (profileData) {
          payload.user_id = profileData.id;
        }
      }

      const { data, error } = await supabase
        .from('players')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setAllPlayers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSuccessMsg(`Player "${newPlayerName}" successfully added!`);
      setNewPlayerName('');
      setNewPlayerEmail('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inserting player record.');
    } finally {
      setPlayerActionLoading(false);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleCreateChampionship = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (selectedPlayerIds.length < 2) {
      setErrorMsg('You must select at least 2 players to start a tournament.');
      return;
    }

    setChampCreationLoading(true);

    try {
      // 1. Create championship record
      const { data: champData, error: champErr } = await supabase
        .from('championships')
        .insert({
          name: newChampName,
          status: 'active',
        })
        .select()
        .single();

      if (champErr) throw champErr;

      // 2. Link players to the championship
      const linkPayload = selectedPlayerIds.map((playerId) => ({
        championship_id: champData.id,
        player_id: playerId,
      }));

      const { error: linkErr } = await supabase
        .from('championship_players')
        .insert(linkPayload);

      if (linkErr) throw linkErr;

      // 3. Generate fixtures using round-robin scheduler
      const scheduledMatches = generateRoundRobin(selectedPlayerIds);
      
      // 4. Batch insert matches
      const matchesPayload = scheduledMatches.map((match) => ({
        championship_id: champData.id,
        round: match.round,
        home_player_id: match.homePlayerId,
        away_player_id: match.awayPlayerId,
        status: 'pending',
      }));

      const { error: matchesErr } = await supabase
        .from('matches')
        .insert(matchesPayload);

      if (matchesErr) throw matchesErr;

      setSuccessMsg(`Championship "${newChampName}" created successfully!`);
      setNewChampName('');
      setSelectedPlayerIds([]);
      
      // Reload admin states
      await loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating championship.');
    } finally {
      setChampCreationLoading(false);
    }
  };

  const handleEndChampionship = async () => {
    if (!activeChampionship) return;
    
    const confirm = window.confirm(
      'Are you sure you want to complete this championship? This will close all score reporting.'
    );
    if (!confirm) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('championships')
        .update({ status: 'completed' })
        .eq('id', activeChampionship.id);

      if (error) throw error;

      setSuccessMsg('Active championship successfully completed! You can now start a new one.');
      await loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error completing championship.');
    }
  };

  const handleDeletePlayer = async (playerId: string, name: string) => {
    const confirm = window.confirm(
      `Are you sure you want to delete player "${name}"? This will delete all their historical match records.`
    );
    if (!confirm) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (error) throw error;

      setAllPlayers((prev) => prev.filter((p) => p.id !== playerId));
      setSuccessMsg(`Player "${name}" deleted.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting player.');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Activity className="animate-fade-in" size={48} color="var(--primary)" style={{ animation: 'pulse 1.5s infinite' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Loading Admin Portal...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const playedMatchesCount = matches.filter((m) => m.status === 'played').length;
  const totalMatchesCount = matches.length;

  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Page Header */}
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Settings color="var(--primary)" size={32} />
          Admin Panel
        </h1>
        <p style={{ marginTop: '0.25rem' }}>
          Manage players and control active round-robin championships
        </p>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="badge badge-pending" style={{ 
          display: 'flex', alignItems: 'center', gap: '0.5rem', 
          width: '100%', borderRadius: 'var(--border-radius-sm)', padding: '0.75rem',
          background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
          textTransform: 'none', fontSize: '0.85rem'
        }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="badge badge-success" style={{ 
          display: 'flex', alignItems: 'center', gap: '0.5rem', 
          width: '100%', borderRadius: 'var(--border-radius-sm)', padding: '0.75rem',
          textTransform: 'none', fontSize: '0.85rem'
        }}>
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid sections */}
      <div className="grid grid-cols-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', alignItems: 'start' }}>
        
        {/* Left Column: Player Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Add Player Form */}
          <div className="card glass">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '1.15rem' }}>
              <UserPlus size={20} color="var(--primary)" />
              Add New Player
            </h3>
            
            <form onSubmit={handleAddPlayer}>
              <div className="form-group">
                <label className="form-label">Player Nickname / Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Gabriel V."
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email (Optional)</label>
                <input 
                  type="email" 
                  placeholder="e.g. user@gmail.com"
                  value={newPlayerEmail}
                  onChange={(e) => setNewPlayerEmail(e.target.value)}
                  className="form-input"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Linking email auto-associates match permission if they sign up.
                </span>
              </div>

              <button 
                type="submit" 
                disabled={playerActionLoading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {playerActionLoading ? 'Adding...' : 'Create Player'}
              </button>
            </form>
          </div>

          {/* Players List */}
          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
              <Users size={20} color="var(--secondary)" />
              System Players ({allPlayers.length})
            </h3>
            
            {allPlayers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {allPlayers.map((player) => (
                  <div key={player.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '0.75rem 1rem', 
                    background: 'rgba(0,0,0,0.15)', 
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{player.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {player.email ? player.email : 'Guest / No Email'}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {player.user_id ? (
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active User</span>
                      ) : player.email ? (
                        <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>Pending Login</span>
                      ) : (
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Guest</span>
                      )}

                      <button 
                        onClick={() => handleDeletePlayer(player.id, player.name)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239,68,68,0.2)' }}
                        title="Delete Player"
                      >
                        <Trash2 size={12} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                No players added to the system yet.
              </span>
            )}
          </div>

        </div>

        {/* Right Column: Championship Management */}
        <div>
          {activeChampionship ? (
            /* Active Championship details & options to Complete */
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <span className="badge badge-success" style={{ marginBottom: '0.5rem' }}>Running</span>
                <h3 style={{ fontSize: '1.3rem' }}>Active Tournament</h3>
              </div>
              
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--border-radius-sm)' }}>
                <h4 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '0.25rem' }}>{activeChampionship.name}</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Created at: {new Date(activeChampionship.created_at).toLocaleDateString()}
                </span>
                
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                    <span>Completion Rate</span>
                    <span style={{ color: 'var(--primary)' }}>{playedMatchesCount} / {totalMatchesCount} matches</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${totalMatchesCount > 0 ? (playedMatchesCount / totalMatchesCount) * 100 : 0}%`, 
                      height: '100%', 
                      background: 'var(--primary)',
                      boxShadow: 'var(--glow-shadow)'
                    }}></div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleEndChampionship}
                className="btn btn-accent"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Complete & End Championship
              </button>
              
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Ending this championship will allow you to generate a new round-robin season.
              </span>
            </div>
          ) : (
            /* Create new Championship panel */
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <Trophy size={20} color="var(--primary)" />
                Start New Season
              </h3>

              <form onSubmit={handleCreateChampionship}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Championship Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Friends Cup 2026"
                    value={newChampName}
                    onChange={(e) => setNewChampName(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '0.5rem' }}>
                    Select Players ({selectedPlayerIds.length} Selected)
                  </label>
                  
                  {allPlayers.length > 0 ? (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.5rem', 
                      maxHeight: '260px', 
                      overflowY: 'auto', 
                      border: '1px solid var(--border-color)', 
                      padding: '0.5rem', 
                      borderRadius: 'var(--border-radius-sm)',
                      background: 'rgba(0,0,0,0.2)'
                    }}>
                      {allPlayers.map((player) => {
                        const isChecked = selectedPlayerIds.includes(player.id);
                        return (
                          <label 
                            key={player.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.75rem', 
                              padding: '0.5rem', 
                              borderRadius: '4px',
                              cursor: 'pointer',
                              background: isChecked ? 'rgba(0,255,102,0.03)' : 'transparent',
                              transition: 'background 0.2s'
                            }}
                          >
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePlayerSelection(player.id)}
                              style={{ accentColor: 'var(--primary)' }}
                            />
                            <span style={{ fontWeight: 600, color: isChecked ? 'var(--primary)' : 'var(--text-primary)' }}>
                              {player.name}
                            </span>
                            {player.email && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ({player.email})
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Add players on the left to start selecting them.
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={champCreationLoading || selectedPlayerIds.length < 2 || !newChampName.trim()}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  <Play size={16} /> {champCreationLoading ? 'Generating Tournament...' : 'Generate & Start Championship'}
                </button>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
