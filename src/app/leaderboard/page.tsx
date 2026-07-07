'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { calculateStandings, PlayerStanding } from '@/lib/utils/standings';
import { Trophy, Award, Activity } from 'lucide-react';

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [activeChampionship, setActiveChampionship] = useState<any>(null);
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [playedMatches, setPlayedMatches] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    try {
      // Get active championship
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
          .select('players(id, name)')
          .eq('championship_id', champData.id);

        if (playersError) throw playersError;

        const flattenedPlayers = (playersData || [])
          .map((p: any) => p.players)
          .filter((p) => p !== null);

        // Fetch matches in this championship
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .eq('championship_id', champData.id);

        if (matchesError) throw matchesError;

        const allMatches = matchesData || [];
        setTotalMatches(allMatches.length);
        setPlayedMatches(allMatches.filter((m) => m.status === 'played').length);

        // Calculate Standings
        if (flattenedPlayers.length > 0) {
          const computedStandings = calculateStandings(
            flattenedPlayers.map(p => ({ id: p.id, name: p.name })),
            allMatches
          );
          setStandings(computedStandings);
        }
      }
    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Activity className="animate-fade-in" size={48} color="var(--primary)" style={{ animation: 'pulse 1.5s infinite' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Calculando classificação...</span>
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
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Nenhum campeonato ativo</h2>
          <p style={{ marginBottom: '2rem', fontSize: '1rem' }}>
            Não há nenhum campeonato EA FC ativo no momento. A classificação estará disponível assim que um campeonato for criado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Info */}
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Award color="var(--primary)" size={32} />
            Classificação
          </h1>
          <p style={{ marginTop: '0.25rem' }}>
            Classificação de <span style={{ color: '#fff', fontWeight: 600 }}>{activeChampionship.name}</span> • {playedMatches}/{totalMatches} partidas realizadas
          </p>
        </div>
        <div className="badge badge-success">
          Liga todos contra todos
        </div>
      </div>

      {/* Standings Table Card */}
      {standings.length > 0 ? (
        <div className="card glass" style={{ padding: '0.5rem', overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>Pos</th>
                  <th>Jogador</th>
                  <th style={{ textAlign: 'center' }}>J</th>
                  <th style={{ textAlign: 'center' }}>V</th>
                  <th style={{ textAlign: 'center' }}>E</th>
                  <th style={{ textAlign: 'center' }}>D</th>
                  <th style={{ textAlign: 'center' }}>GP</th>
                  <th style={{ textAlign: 'center' }}>GC</th>
                  <th style={{ textAlign: 'center' }}>SG</th>
                  <th style={{ textAlign: 'center', background: 'rgba(0, 255, 102, 0.05)', color: 'var(--primary)', fontWeight: 800 }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((standing, index) => {
                  const isFirst = index === 0;
                  const isSecond = index === 1;
                  const isThird = index === 2;
                  
                  return (
                    <tr 
                      key={standing.playerId}
                      style={isFirst ? {
                        background: 'rgba(0, 255, 102, 0.02)',
                        borderLeft: '4px solid var(--primary)'
                      } : {}}
                    >
                      {/* Position */}
                      <td style={{ 
                        textAlign: 'center', 
                        fontWeight: 800, 
                        fontSize: isFirst ? '1.1rem' : '1rem',
                        color: isFirst ? '#ffd700' : isSecond ? '#c0c0c0' : isThird ? '#cd7f32' : 'var(--text-secondary)'
                      }}>
                        {isFirst ? '🏆' : index + 1}
                      </td>
                      
                      {/* Player Name */}
                      <td style={{ fontWeight: 600, color: isFirst ? '#fff' : 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{standing.playerName}</span>
                          {isFirst && (
                            <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>Líder</span>
                          )}
                        </div>
                      </td>
                      
                      {/* Stats columns */}
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{standing.played}</td>
                      <td style={{ textAlign: 'center', color: '#10b981' }}>{standing.wins}</td>
                      <td style={{ textAlign: 'center', color: '#f59e0b' }}>{standing.draws}</td>
                      <td style={{ textAlign: 'center', color: '#ef4444' }}>{standing.losses}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{standing.goalsFor}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{standing.goalsAgainst}</td>
                      
                      {/* Goal Difference */}
                      <td style={{ 
                        textAlign: 'center', 
                        fontWeight: 600,
                        color: standing.goalDifference > 0 ? '#10b981' : standing.goalDifference < 0 ? '#ef4444' : 'var(--text-secondary)'
                      }}>
                        {standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}
                      </td>
                      
                      {/* Points */}
                      <td style={{ 
                        textAlign: 'center', 
                        fontWeight: 800, 
                        fontSize: '1.1rem',
                        background: 'rgba(0, 255, 102, 0.03)', 
                        color: isFirst ? 'var(--primary)' : '#fff'
                      }}>
                        {standing.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card glass" style={{ padding: '3rem', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>A tabela de classificação está vazia. É necessário registrar partidas para calcular as posições.</span>
        </div>
      )}
      
      {/* Legend / Tiebreaker disclaimer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <div>J = Jogos • V = Vitórias • E = Empates • D = Derrotas • GP = Gols pró • GC = Gols contra • SG = Saldo de gols • Pts = Pontos</div>
        <div style={{ fontStyle: 'italic' }}>Critérios de desempate: Pontos ➔ Saldo de gols ➔ Gols pró</div>
      </div>

    </div>
  );
}
