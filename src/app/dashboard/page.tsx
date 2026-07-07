'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { calculateStandings, PlayerStanding } from '@/lib/utils/standings';
import { 
  Trophy, 
  Calendar, 
  CheckCircle, 
  Play, 
  User, 
  Award,
  ChevronRight,
  TrendingUp,
  Activity
} from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeChampionship, setActiveChampionship] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [pendingMatches, setPendingMatches] = useState<any[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Get current user and admin status
      const { data: { user } } = await supabase.auth.getUser();
      setIsAdmin(user?.email === 'ged.venegas@gmail.com');

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

        // Flatten player details
        const flattenedPlayers = (playersData || [])
          .map((p: any) => p.players)
          .filter((p) => p !== null);
        setPlayers(flattenedPlayers);

        // Fetch matches in this championship
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .eq('championship_id', champData.id)
          .order('round', { ascending: true });

        if (matchesError) throw matchesError;

        const allMatches = matchesData || [];
        setMatches(allMatches);

        // Calculate Standings
        if (flattenedPlayers.length > 0) {
          const computedStandings = calculateStandings(
            flattenedPlayers.map(p => ({ id: p.id, name: p.name })),
            allMatches
          );
          setStandings(computedStandings);
        }

        // Get 3 upcoming pending matches
        const pending = allMatches
          .filter((m) => m.status === 'pending')
          .slice(0, 3);
        setPendingMatches(pending);

        // Get 3 recent played matches
        const recent = allMatches
          .filter((m) => m.status === 'played')
          // Sort by played_at desc if available, otherwise order desc
          .sort((a, b) => {
            const dateA = a.played_at ? new Date(a.played_at).getTime() : 0;
            const dateB = b.played_at ? new Date(b.played_at).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 3);
        setRecentMatches(recent);
      } else {
        setActiveChampionship(null);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPlayerName = (id: string) => {
    return players.find((p) => p.id === id)?.name || 'Unknown Player';
  };

  const playedCount = matches.filter((m) => m.status === 'played').length;
  const totalCount = matches.length;
  const progressPercent = totalCount > 0 ? Math.round((playedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Activity className="animate-fade-in" size={48} color="var(--primary)" style={{ animation: 'pulse 1.5s infinite' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Loading Dashboard...</span>
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
            There is currently no active EA FC tournament running.
          </p>
          {isAdmin ? (
            <Link href="/admin" className="btn btn-primary" style={{ padding: '0.8rem 2rem' }}>
              Create Championship
            </Link>
          ) : (
            <div className="badge badge-pending" style={{ textTransform: 'none', padding: '0.75rem 1.5rem' }}>
              Waiting for ged.venegas@gmail.com to start a new season...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Banner Summary */}
      <div className="card glass" style={{ 
        padding: '2rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1.5rem',
        background: 'linear-gradient(135deg, rgba(18,23,33,0.8) 0%, rgba(10,14,20,0.9) 100%)'
      }}>
        <div>
          <span className="badge badge-success" style={{ marginBottom: '0.5rem' }}>Active Season</span>
          <h1 style={{ fontSize: '2.2rem', textShadow: '0 0 10px rgba(255,255,255,0.1)' }}>{activeChampionship.name}</h1>
          <p style={{ marginTop: '0.25rem', fontSize: '0.95rem' }}>
            Round-Robin Tournament • {players.length} Players
          </p>
        </div>
        
        {/* Progress Circle & Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>Completion</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>
              {playedCount} / {totalCount} <span style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>played</span>
            </span>
          </div>
          
          {/* Progress Circular visual */}
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: `conic-gradient(var(--primary) ${progressPercent}%, rgba(255,255,255,0.05) ${progressPercent}%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <div style={{ 
              width: '52px', 
              height: '52px', 
              borderRadius: '50%', 
              background: 'var(--bg-card)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 700
            }}>
              {progressPercent}%
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout for dashboard items */}
      <div className="grid grid-cols-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        
        {/* Leaderboard Snippet */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Award size={18} color="var(--primary)" />
              Top Standings
            </h3>
            <Link href="/leaderboard" style={{ fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              View All <ChevronRight size={14} />
            </Link>
          </div>

          {standings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              {standings.slice(0, 3).map((standing, index) => {
                const colors = ['#ffd700', '#c0c0c0', '#cd7f32']; // Gold, Silver, Bronze
                return (
                  <div key={standing.playerId} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '0.85rem 1rem', 
                    background: 'rgba(0,0,0,0.2)', 
                    borderRadius: 'var(--border-radius-sm)',
                    borderLeft: `3px solid ${colors[index] || 'transparent'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ 
                        fontWeight: 800, 
                        color: colors[index] || 'var(--text-secondary)',
                        fontSize: '1.1rem',
                        width: '20px'
                      }}>
                        {index + 1}
                      </span>
                      <span style={{ fontWeight: 600 }}>{standing.playerName}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>W: {standing.wins}</span>
                      <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{standing.points} PTS</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '150px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No standings data available yet.</span>
            </div>
          )}
        </div>

        {/* Action / Next Matches Snippet */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Calendar size={18} color="var(--secondary)" />
              Next Fixtures
            </h3>
            <Link href="/matches" style={{ fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              All Matches <ChevronRight size={14} />
            </Link>
          </div>

          {pendingMatches.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              {pendingMatches.map((match) => (
                <div key={match.id} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem', 
                  padding: '0.85rem 1rem', 
                  background: 'rgba(0,0,0,0.2)', 
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>ROUND {match.round}</span>
                    <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Play size={10} /> Pending
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span style={{ width: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getPlayerName(match.home_player_id)}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>VS</span>
                    <span style={{ width: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {getPlayerName(match.away_player_id)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '150px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                All matches played! 🎉
              </span>
            </div>
          )}
        </div>

        {/* Recent Results Snippet */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <CheckCircle size={18} color="var(--primary)" />
              Recent Results
            </h3>
            <Link href="/matches" style={{ fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              All Results <ChevronRight size={14} />
            </Link>
          </div>

          {recentMatches.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              {recentMatches.map((match) => (
                <div key={match.id} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem', 
                  padding: '0.85rem 1rem', 
                  background: 'rgba(0,0,0,0.2)', 
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid rgba(0, 255, 102, 0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>ROUND {match.round}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Played</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span style={{ width: '35%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getPlayerName(match.home_player_id)}
                    </span>
                    <span style={{ 
                      fontSize: '1rem', 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      padding: '0.1rem 0.5rem', 
                      borderRadius: '4px',
                      color: 'var(--primary)',
                      fontFamily: 'monospace'
                    }}>
                      {match.home_score} - {match.away_score}
                    </span>
                    <span style={{ width: '35%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {getPlayerName(match.away_player_id)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '150px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No matches played yet.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
