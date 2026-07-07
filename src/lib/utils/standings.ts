export interface PlayerStanding {
  playerId: string;
  playerName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface MatchData {
  home_player_id: string;
  away_player_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

export interface PlayerData {
  id: string;
  name: string;
}

/**
 * Calculates a league standing table given a list of players and played match records.
 * Rules: 3 pts for Win, 1 pt for Draw, 0 pts for Loss.
 * Ties resolved by: Points -> Goal Difference -> Goals For -> Alphabetical Name.
 */
export function calculateStandings(
  players: PlayerData[],
  matches: MatchData[]
): PlayerStanding[] {
  const standingsMap = new Map<string, PlayerStanding>();

  // Pre-populate standings for all registered/participating players
  players.forEach((p) => {
    standingsMap.set(p.id, {
      playerId: p.id,
      playerName: p.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  });

  // Process score sheets
  matches.forEach((m) => {
    if (
      m.status !== 'played' ||
      m.home_score === null ||
      m.away_score === null
    ) {
      return;
    }

    const home = standingsMap.get(m.home_player_id);
    const away = standingsMap.get(m.away_player_id);

    if (home) {
      home.played += 1;
      home.goalsFor += m.home_score;
      home.goalsAgainst += m.away_score;
    }

    if (away) {
      away.played += 1;
      away.goalsFor += m.away_score;
      away.goalsAgainst += m.home_score;
    }

    // Assign points
    if (m.home_score > m.away_score) {
      if (home) {
        home.wins += 1;
        home.points += 3;
      }
      if (away) {
        away.losses += 1;
      }
    } else if (m.home_score < m.away_score) {
      if (away) {
        away.wins += 1;
        away.points += 3;
      }
      if (home) {
        home.losses += 1;
      }
    } else {
      if (home) {
        home.draws += 1;
        home.points += 1;
      }
      if (away) {
        away.draws += 1;
        away.points += 1;
      }
    }
  });

  // Calculate final Goal Differences
  const standings = Array.from(standingsMap.values()).map((s) => ({
    ...s,
    goalDifference: s.goalsFor - s.goalsAgainst,
  }));

  // Sort: Points DESC -> Goal Difference DESC -> Goals For DESC -> Name ASC
  return standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.playerName.localeCompare(b.playerName);
  });
}
