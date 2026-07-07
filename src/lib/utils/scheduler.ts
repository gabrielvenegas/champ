export interface ScheduledMatch {
  round: number;
  homePlayerId: string;
  awayPlayerId: string;
}

/**
 * Generates a round-robin schedule for a list of player IDs using the Circle/Polygon Method.
 * Balanced home/away assignments.
 */
export function generateRoundRobin(playerIds: string[]): ScheduledMatch[] {
  if (playerIds.length < 2) return [];

  const list = [...playerIds];
  const isOdd = list.length % 2 !== 0;

  if (isOdd) {
    list.push('BYE');
  }

  const n = list.length;
  const totalRounds = n - 1;
  const matches: ScheduledMatch[] = [];

  for (let round = 1; round <= totalRounds; round++) {
    for (let i = 0; i < n / 2; i++) {
      const home = list[i];
      const away = list[n - 1 - i];

      // Ignore BYE (dummy player) matches
      if (home !== 'BYE' && away !== 'BYE') {
        // Alternating home/away assignment to ensure fairness
        if (round % 2 === 0) {
          matches.push({ round, homePlayerId: home, awayPlayerId: away });
        } else {
          matches.push({ round, homePlayerId: away, awayPlayerId: home });
        }
      }
    }

    // Rotate array: keep the first element fixed, move the last element to the second position
    const lastElement = list.pop();
    if (lastElement !== undefined) {
      list.splice(1, 0, lastElement);
    }
  }

  // Sort matches by round
  return matches.sort((a, b) => a.round - b.round);
}
