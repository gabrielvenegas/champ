'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Calendar, Check, Edit2, X, Activity, CalendarPlus } from 'lucide-react';

interface MatchWithSchedule {
  id: string;
  round: number;
  scheduled_at?: string | null;
}

export default function MatchesPage() {
  const [loading, setLoading] = useState(true);
  const [activeChampionship, setActiveChampionship] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  
  // User auth details
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  // Round navigation
  const [rounds, setRounds] = useState<number[]>([]);
  const [activeRound, setActiveRound] = useState<number>(1);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'played'>('all');

  // Match editing states
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [homeScoreInput, setHomeScoreInput] = useState<string>('');
  const [awayScoreInput, setAwayScoreInput] = useState<string>('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const getMatchDate = (match: MatchWithSchedule) => {
    if (match.scheduled_at) {
      return new Date(match.scheduled_at);
    }

    const baseDate = activeChampionship ? new Date(activeChampionship.created_at) : new Date();
    const matchDate = new Date(baseDate);
    matchDate.setDate(matchDate.getDate() + match.round * 2);
    matchDate.setHours(18, 0, 0, 0);
    return matchDate;
  };

  const formatMatchDate = (match: MatchWithSchedule) => {
    return getMatchDate(match).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownloadICSFile = (match: MatchWithSchedule, homeName: string, awayName: string) => {
    const matchDate = getMatchDate(match);
    
    const endDate = new Date(matchDate);
    endDate.setHours(matchDate.getHours() + 1);

    const champName = activeChampionship?.name || 'EA FC Championship';
    const title = `EA FC Match: ${homeName} vs ${awayName}`;
    const description = `Round-robin match in the championship "${champName}".\\n\\nHome: ${homeName}\\nAway: ${awayName}\\n\\nRecord results on: ${window.location.origin}/matches`;
    const formatDateTime = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FC Championship//NONSGML Event//EN',
      'BEGIN:VEVENT',
      `UID:${match.id}@fc-championship`,
      `DTSTAMP:${formatDateTime(new Date())}`,
      `DTSTART:${formatDateTime(matchDate)}`,
      `DTEND:${formatDateTime(endDate)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `match_round_${match.round}_${homeName}_vs_${awayName}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const supabase = createClient();

  useEffect(() => {
    fetchMatchesData();
  }, []);

  const fetchMatchesData = async () => {
    setLoading(true);
    try {
      // Get logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAdmin(user.email === 'ged.venegas@gmail.com');
        
        // Find player record linked to this user
        const { data: playerData } = await supabase
          .from('players')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (playerData) {
          setCurrentPlayerId(playerData.id);
        }
      }

      // Fetch active championship
      const { data: champData, error: champError } = await supabase
        .from('championships')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (champError) throw champError;

      if (champData) {
        setActiveChampionship(champData);

        // Fetch players in this championship
        const { data: playersData, error: playersError } = await supabase
          .from('championship_players')
          .select('players(id, name, email)')
          .eq('championship_id', champData.id);

        if (playersError) throw playersError;

        const flattenedPlayers = (playersData || [])
          .map((p: any) => p.players)
          .filter((p) => p !== null);
        setPlayers(flattenedPlayers);

        // Fetch matches in this championship
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .eq('championship_id', champData.id)
          .order('round', { ascending: true })
          .order('scheduled_at', { ascending: true })
          .order('created_at', { ascending: true });

        if (matchesError) throw matchesError;

        const allMatches = matchesData || [];
        setMatches(allMatches);

        // Calculate unique rounds list
        const uniqueRounds = Array.from(new Set(allMatches.map((m) => m.round)));
        setRounds(uniqueRounds);
        
        // Initialize active round if it exists, try to default to the first round that has pending matches
        if (uniqueRounds.length > 0) {
          const firstPendingRound = uniqueRounds.find(r => 
            allMatches.some(m => m.round === r && m.status === 'pending')
          );
          setActiveRound(firstPendingRound || uniqueRounds[0]);
        }
      }
    } catch (err) {
      console.error('Error loading matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPlayerName = (id: string) => {
    return players.find((p) => p.id === id)?.name || 'Unknown Player';
  };

  const isEditable = (match: any) => {
    if (isAdmin) return true;
    if (!currentPlayerId) return false;
    return match.home_player_id === currentPlayerId || match.away_player_id === currentPlayerId;
  };

  const startEditing = (match: any) => {
    setEditingMatchId(match.id);
    setHomeScoreInput(match.home_score !== null ? String(match.home_score) : '');
    setAwayScoreInput(match.away_score !== null ? String(match.away_score) : '');
    setErrorMsg(null);
  };

  const cancelEditing = () => {
    setEditingMatchId(null);
    setHomeScoreInput('');
    setAwayScoreInput('');
    setErrorMsg(null);
  };

  const saveScore = async (matchId: string) => {
    const home = parseInt(homeScoreInput, 10);
    const away = parseInt(awayScoreInput, 10);

    if (isNaN(home) || isNaN(away)) {
      setErrorMsg('Please enter valid scores for both players.');
      return;
    }

    setSavingId(matchId);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_score: home,
          away_score: away,
          status: 'played',
          played_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      if (error) throw error;

      // Update local state instantly
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? {
                ...m,
                home_score: home,
                away_score: away,
                status: 'played',
                played_at: new Date().toISOString(),
              }
            : m
        )
      );

      setEditingMatchId(null);
    } catch (err: any) {
      console.error('Error saving score:', err);
      setErrorMsg(err.message || 'Error updating score. Check permissions.');
    } finally {
      setSavingId(null);
    }
  };

  // Filter matches for the selected round and filter status
  const filteredMatches = matches.filter((m) => {
    const roundMatch = m.round === activeRound;
    if (!roundMatch) return false;

    if (filterStatus === 'pending') return m.status === 'pending';
    if (filterStatus === 'played') return m.status === 'played';
    return true;
  });

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Activity className="animate-fade-in" size={48} color="var(--primary)" style={{ animation: 'pulse 1.5s infinite' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Loading Matches...</span>
        </div>
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.95); }
          }
        `}</style>
      </div>
    );
  }

  if (!activeChampionship) {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '600px', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div className="card glass" style={{ padding: '3rem 2rem' }}>
          <Trophy size={64} color="var(--text-muted)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>No Active Championship</h2>
          <p style={{ marginBottom: '2rem', fontSize: '1rem' }}>
            There is currently no active EA FC tournament running. Fixtures will be generated when a championship is started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header section */}
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar color="var(--primary)" size={32} />
            Championship Fixtures
          </h1>
          <p style={{ marginTop: '0.25rem' }}>
            Manage and view matches for <span style={{ color: '#fff', fontWeight: 600 }}>{activeChampionship.name}</span>
          </p>
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '0.2rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => setFilterStatus('all')}
            className={`btn ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', borderRadius: 'calc(var(--border-radius-sm) - 4px)', border: 'none' }}
          >
            All
          </button>
          <button 
            onClick={() => setFilterStatus('pending')}
            className={`btn ${filterStatus === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', borderRadius: 'calc(var(--border-radius-sm) - 4px)', border: 'none' }}
          >
            Pending
          </button>
          <button 
            onClick={() => setFilterStatus('played')}
            className={`btn ${filterStatus === 'played' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', borderRadius: 'calc(var(--border-radius-sm) - 4px)', border: 'none' }}
          >
            Played
          </button>
        </div>
      </div>

      {/* Rounds Navigation Bar */}
      {rounds.length > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          overflowX: 'auto', 
          paddingBottom: '0.5rem', 
          borderBottom: '1px solid var(--border-color)',
          scrollbarWidth: 'thin'
        }}>
          {rounds.map((round) => (
            <button
              key={round}
              onClick={() => { setActiveRound(round); cancelEditing(); }}
              className={`btn ${activeRound === round ? 'btn-accent' : 'btn-secondary'}`}
              style={{ 
                padding: '0.5rem 1.25rem', 
                fontSize: '0.85rem', 
                borderRadius: '9999px',
                flexShrink: 0,
                border: activeRound === round ? 'none' : '1px solid var(--border-color)',
                boxShadow: activeRound === round ? 'var(--purple-shadow)' : 'none'
              }}
            >
              Round {round}
            </button>
          ))}
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="badge badge-pending" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: 'var(--border-radius-sm)',
          padding: '0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          textTransform: 'none',
          fontSize: '0.85rem'
        }}>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Matches List Grid */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
          {filteredMatches.map((match) => {
            const isEditing = editingMatchId === match.id;
            const canEdit = isEditable(match);
            const isHomeWinner = match.status === 'played' && match.home_score > match.away_score;
            const isAwayWinner = match.status === 'played' && match.away_score > match.home_score;
            
            return (
              <div 
                key={match.id} 
                className="card glass animate-fade-in"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1.25rem', 
                  border: isEditing ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  boxShadow: isEditing ? 'var(--glow-shadow)' : 'none'
                }}
              >
                {/* Match Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem', position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>ROUND {match.round}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)' }}>{formatMatchDate(match)}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleDownloadICSFile(match, getPlayerName(match.home_player_id), getPlayerName(match.away_player_id))}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', background: 'transparent' }}
                      title="Add to Calendar"
                    >
                      <CalendarPlus size={14} color="var(--primary)" />
                    </button>

                    <span className={`badge ${match.status === 'played' ? 'badge-success' : 'badge-pending'}`}>
                      {match.status}
                    </span>
                  </div>
                </div>

                {/* Match Matchup Component */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                  
                  {/* Home Player */}
                  <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ 
                      fontWeight: 700, 
                      fontSize: '1rem', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      color: isHomeWinner ? 'var(--primary)' : 'var(--text-primary)'
                    }}>
                      {getPlayerName(match.home_player_id)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Home</span>
                  </div>

                  {/* Score display or Editor */}
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '20%', justifyContent: 'center' }}>
                      <input 
                        type="number"
                        min="0"
                        value={homeScoreInput}
                        onChange={(e) => setHomeScoreInput(e.target.value)}
                        className="form-input"
                        style={{ width: '45px', padding: '0.35rem', textAlign: 'center', fontFamily: 'monospace', fontSize: '1.1rem' }}
                      />
                      <span style={{ color: 'var(--text-secondary)' }}>-</span>
                      <input 
                        type="number"
                        min="0"
                        value={awayScoreInput}
                        onChange={(e) => setAwayScoreInput(e.target.value)}
                        className="form-input"
                        style={{ width: '45px', padding: '0.35rem', textAlign: 'center', fontFamily: 'monospace', fontSize: '1.1rem' }}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20%' }}>
                      {match.status === 'played' ? (
                        <div style={{ 
                          fontSize: '1.4rem', 
                          fontWeight: 800, 
                          letterSpacing: '0.1em', 
                          background: 'rgba(255, 255, 255, 0.04)', 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '6px',
                          color: '#fff',
                          fontFamily: 'monospace'
                        }}>
                          {match.home_score} - {match.away_score}
                        </div>
                      ) : (
                        <div style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: 600, 
                          color: 'var(--text-muted)',
                          border: '1px dashed var(--border-color)',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '6px'
                        }}>
                          VS
                        </div>
                      )}
                    </div>
                  )}

                  {/* Away Player */}
                  <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end', textAlign: 'right' }}>
                    <span style={{ 
                      fontWeight: 700, 
                      fontSize: '1rem', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      color: isAwayWinner ? 'var(--primary)' : 'var(--text-primary)'
                    }}>
                      {getPlayerName(match.away_player_id)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Away</span>
                  </div>

                </div>

                {/* Match Card Footer Buttons */}
                {canEdit && (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                    {isEditing ? (
                      <>
                        <button 
                          onClick={cancelEditing} 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          disabled={savingId === match.id}
                        >
                          <X size={14} /> Cancel
                        </button>
                        <button 
                          onClick={() => saveScore(match.id)} 
                          className="btn btn-primary" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          disabled={savingId === match.id}
                        >
                          <Check size={14} /> {savingId === match.id ? 'Saving...' : 'Save'}
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => startEditing(match)} 
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        <Edit2 size={14} /> {match.status === 'played' ? 'Update Score' : 'Record Score'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card glass animate-fade-in" style={{ padding: '3rem', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>No matches found in Round {activeRound} matching filter status.</span>
        </div>
      )}

    </div>
  );
}
