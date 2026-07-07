'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Calendar, Check, Edit2, X, Activity, CalendarPlus, RotateCcw } from 'lucide-react';

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
    return getMatchDate(match).toLocaleString('pt-BR', {
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

    const champName = activeChampionship?.name || 'Campeonato EA FC';
    const title = `Partida EA FC: ${homeName} x ${awayName}`;
    const description = `Partida todos contra todos no campeonato "${champName}".\\n\\nMandante: ${homeName}\\nVisitante: ${awayName}\\n\\nRegistre os resultados em: ${window.location.origin}/matches`;
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
    return players.find((p) => p.id === id)?.name || 'Jogador desconhecido';
  };

  const getMatchStatusLabel = (status: string) =>
    status === 'played' ? 'Realizada' : 'Pendente';

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
      setErrorMsg('Informe placares válidos para ambos os jogadores.');
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
      setErrorMsg(err.message || 'Erro ao atualizar placar. Verifique suas permissões.');
    } finally {
      setSavingId(null);
    }
  };

  const resetScore = async (matchId: string) => {
    const confirm = window.confirm('Redefinir o placar desta partida e marcá-la como pendente?');
    if (!confirm) return;

    setSavingId(matchId);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_score: null,
          away_score: null,
          status: 'pending',
          played_at: null,
        })
        .eq('id', matchId);

      if (error) throw error;

      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? {
                ...m,
                home_score: null,
                away_score: null,
                status: 'pending',
                played_at: null,
              }
            : m
        )
      );

      setEditingMatchId(null);
      setHomeScoreInput('');
      setAwayScoreInput('');
    } catch (err: any) {
      console.error('Error resetting score:', err);
      setErrorMsg(err.message || 'Erro ao redefinir placar. Verifique suas permissões.');
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
          <span style={{ color: 'var(--text-secondary)' }}>Carregando partidas...</span>
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
            Não há nenhum campeonato EA FC ativo no momento. Os jogos serão gerados quando um campeonato for iniciado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container match-page animate-fade-in">
      
      {/* Header section */}
      <div className="match-page-header">
        <div>
          <h1 className="match-page-title">
            <Calendar color="var(--primary)" size={30} />
            Jogos
          </h1>
          <p className="match-page-subtitle">
            Gerencie e visualize as partidas de <span style={{ color: '#fff', fontWeight: 600 }}>{activeChampionship.name}</span>
          </p>
        </div>

        {/* Status Filters */}
        <div className="match-filter-tabs">
          <button 
            onClick={() => setFilterStatus('all')}
            className={`btn match-filter-tab ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Todas
          </button>
          <button 
            onClick={() => setFilterStatus('pending')}
            className={`btn match-filter-tab ${filterStatus === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setFilterStatus('played')}
            className={`btn match-filter-tab ${filterStatus === 'played' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Realizadas
          </button>
        </div>
      </div>

      {/* Rounds Navigation Bar */}
      {rounds.length > 0 && (
        <div className="round-tabs">
          {rounds.map((round) => (
            <button
              key={round}
              onClick={() => { setActiveRound(round); cancelEditing(); }}
              className={`btn round-tab ${activeRound === round ? 'btn-accent' : 'btn-secondary'}`}
              style={{
                border: activeRound === round ? 'none' : '1px solid var(--border-color)',
                boxShadow: activeRound === round ? 'var(--purple-shadow)' : 'none'
              }}
            >
              Rodada {round}
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
        <div className="grid grid-cols-2 match-grid">
          {filteredMatches.map((match) => {
            const isEditing = editingMatchId === match.id;
            const canEdit = isEditable(match);
            const isHomeWinner = match.status === 'played' && match.home_score > match.away_score;
            const isAwayWinner = match.status === 'played' && match.away_score > match.home_score;
            
            return (
              <div 
                key={match.id} 
                className="card glass match-card animate-fade-in"
                style={{ 
                  border: isEditing ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  boxShadow: isEditing ? 'var(--glow-shadow)' : 'none'
                }}
              >
                {/* Match Card Header */}
                <div className="match-card-header">
                  <div className="match-meta">
                    <span className="match-round-label">RODADA {match.round}</span>
                    <span className="match-date-label">{formatMatchDate(match)}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleDownloadICSFile(match, getPlayerName(match.home_player_id), getPlayerName(match.away_player_id))}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', background: 'transparent' }}
                      title="Adicionar ao calendário"
                    >
                      <CalendarPlus size={14} color="var(--primary)" />
                    </button>

                    <span className={`badge ${match.status === 'played' ? 'badge-success' : 'badge-pending'}`}>
                      {getMatchStatusLabel(match.status)}
                    </span>
                  </div>
                </div>

                {/* Match Matchup Component */}
                  <div className="match-body">
                  
                  {/* Home Player */}
                  <div className="match-player">
                    <span className="match-player-name" style={{ color: isHomeWinner ? 'var(--primary)' : 'var(--text-primary)' }}>
                      {getPlayerName(match.home_player_id)}
                    </span>
                    <span className="match-player-role">Mandante</span>
                  </div>

                  {/* Score display or Editor */}
                  {isEditing ? (
                    <div className="match-score-editor">
                      <input 
                        type="number"
                        min="0"
                        value={homeScoreInput}
                        onChange={(e) => setHomeScoreInput(e.target.value)}
                        className="form-input"
                        style={{ width: '46px', padding: '0.35rem', textAlign: 'center', fontSize: '1rem' }}
                      />
                      <span style={{ color: 'var(--text-secondary)' }}>-</span>
                      <input 
                        type="number"
                        min="0"
                        value={awayScoreInput}
                        onChange={(e) => setAwayScoreInput(e.target.value)}
                        className="form-input"
                        style={{ width: '46px', padding: '0.35rem', textAlign: 'center', fontSize: '1rem' }}
                      />
                    </div>
                  ) : (
                    <div className="match-score-wrap">
                      {match.status === 'played' ? (
                        <div className="match-score">
                          {match.home_score} - {match.away_score}
                        </div>
                      ) : (
                        <div className="match-vs">
                          VS
                        </div>
                      )}
                    </div>
                  )}

                  {/* Away Player */}
                  <div className="match-player match-player-away">
                    <span className="match-player-name" style={{ color: isAwayWinner ? 'var(--primary)' : 'var(--text-primary)' }}>
                      {getPlayerName(match.away_player_id)}
                    </span>
                    <span className="match-player-role">Visitante</span>
                  </div>

                </div>

                {/* Match Card Footer Buttons */}
                {canEdit && (
                  <div className="match-actions">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={cancelEditing} 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          disabled={savingId === match.id}
                        >
                          <X size={14} /> Cancelar
                        </button>
                        {match.status === 'played' && (
                          <button
                            onClick={() => resetScore(match.id)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'rgba(239,68,68,0.35)', color: '#f87171' }}
                            disabled={savingId === match.id}
                          >
                            <RotateCcw size={14} /> Redefinir
                          </button>
                        )}
                        <button 
                          onClick={() => saveScore(match.id)} 
                          className="btn btn-primary" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          disabled={savingId === match.id}
                        >
                          <Check size={14} /> {savingId === match.id ? 'Salvando...' : 'Salvar'}
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => startEditing(match)} 
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        <Edit2 size={14} /> {match.status === 'played' ? 'Atualizar placar' : 'Registrar placar'}
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
          <span style={{ color: 'var(--text-secondary)' }}>Nenhuma partida encontrada na Rodada {activeRound} com o filtro selecionado.</span>
        </div>
      )}

    </div>
  );
}
