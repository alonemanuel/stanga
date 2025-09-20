// Pure statistics calculation functions
// These functions take database query results and compute metrics without UI coupling

export interface Rules {
  points: {
    loss: number;
    draw: number;
    penalty_bonus_win: number;
    regulation_win: number;
  };
  penalty_win_weight: number;
}

export interface Game {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  winnerTeamId?: string | null;
  endReason?: string | null; // 'regulation', 'extra_time', 'penalties', 'early_finish'
  status: string;
  matchdayId: string;
}

export interface GameEvent {
  id: string;
  gameId: string;
  playerId?: string | null;
  teamId: string;
  eventType: string; // 'goal', 'assist', 'penalty_goal', 'penalty_miss', etc.
  minute?: number | null;
  isActive: boolean;
}

export interface Player {
  id: string;
  name: string;
  nickname?: string | null;
}

export interface Team {
  id: string;
  name: string;
  matchdayId: string;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  goalsPerGame: number;
  penaltyGoals: number;
  penaltyMisses: number;
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  matchdayId: string;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  penaltyWins: number;
  penaltyLosses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface OverallPlayerStats extends PlayerStats {
  matchdaysPlayed: number;
  winRate: number; // percentage of games won
}

/**
 * Calculate points for a team in a specific game based on rules
 */
export function pointsFor(game: Game, teamId: string, rules: Rules): number {
  // Game must be completed to award points
  if (game.status !== 'completed') {
    return 0;
  }

  const isWinner = game.winnerTeamId === teamId;
  const isLoser = game.winnerTeamId && game.winnerTeamId !== teamId;
  const isDraw = !game.winnerTeamId;

  if (isWinner) {
    if (game.endReason === 'penalties') {
      // Penalty win: draw points + weighted bonus
      return rules.points.draw + (rules.points.penalty_bonus_win * rules.penalty_win_weight);
    }
    // Regulation or extra time win
    return rules.points.regulation_win;
  }

  if (isDraw || (game.endReason === 'penalties' && isLoser)) {
    // Draw or penalty loss (both teams get draw points in penalties)
    return rules.points.draw;
  }

  // Loss in regulation or extra time
  return rules.points.loss;
}

/**
 * Compute player statistics from game events
 */
export function computePlayerStats(
  events: GameEvent[],
  games: Game[],
  players: Player[]
): PlayerStats[] {
  const playerMap = new Map(players.map(p => [p.id, p]));
  const gameMap = new Map(games.map(g => [g.id, g]));
  const statsMap = new Map<string, PlayerStats>();

  // Initialize stats for all players
  players.forEach(player => {
    statsMap.set(player.id, {
      playerId: player.id,
      playerName: player.nickname || player.name,
      gamesPlayed: 0,
      goals: 0,
      assists: 0,
      goalsPerGame: 0,
      penaltyGoals: 0,
      penaltyMisses: 0,
    });
  });

  // Count games played per player
  const playerGames = new Set<string>();
  events.forEach(event => {
    if (event.playerId && event.isActive) {
      const game = gameMap.get(event.gameId);
      if (game && game.status === 'completed') {
        playerGames.add(`${event.playerId}-${event.gameId}`);
      }
    }
  });

  // Count games played
  playerGames.forEach(playerGame => {
    const [playerId] = playerGame.split('-');
    const stats = statsMap.get(playerId);
    if (stats) {
      stats.gamesPlayed++;
    }
  });

  // Process events to calculate stats
  events.forEach(event => {
    if (!event.playerId || !event.isActive) return;

    const stats = statsMap.get(event.playerId);
    if (!stats) return;

    const game = gameMap.get(event.gameId);
    if (!game || game.status !== 'completed') return;

    switch (event.eventType) {
      case 'goal':
        stats.goals++;
        break;
      case 'assist':
        stats.assists++;
        break;
      case 'penalty_goal':
        stats.goals++;
        stats.penaltyGoals++;
        break;
      case 'penalty_miss':
        stats.penaltyMisses++;
        break;
    }
  });

  // Calculate derived stats
  statsMap.forEach(stats => {
    stats.goalsPerGame = stats.gamesPlayed > 0 ? stats.goals / stats.gamesPlayed : 0;
  });

  return Array.from(statsMap.values()).filter(stats => stats.gamesPlayed > 0);
}

/**
 * Compute team standings for a specific matchday
 */
export function computeStandings(
  games: Game[],
  teams: Team[],
  rules: Rules
): TeamStanding[] {
  const teamMap = new Map(teams.map(t => [t.id, t]));
  const standingsMap = new Map<string, TeamStanding>();

  // Initialize standings for all teams
  teams.forEach(team => {
    standingsMap.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      matchdayId: team.matchdayId,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      penaltyWins: 0,
      penaltyLosses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  });

  // Process completed games
  games.filter(game => game.status === 'completed').forEach(game => {
    const homeStanding = standingsMap.get(game.homeTeamId);
    const awayStanding = standingsMap.get(game.awayTeamId);

    if (!homeStanding || !awayStanding) return;

    // Update games played
    homeStanding.gamesPlayed++;
    awayStanding.gamesPlayed++;

    // Update goals
    homeStanding.goalsFor += game.homeScore;
    homeStanding.goalsAgainst += game.awayScore;
    awayStanding.goalsFor += game.awayScore;
    awayStanding.goalsAgainst += game.homeScore;

    // Update goal difference
    homeStanding.goalDifference = homeStanding.goalsFor - homeStanding.goalsAgainst;
    awayStanding.goalDifference = awayStanding.goalsFor - awayStanding.goalsAgainst;

    // Update wins/draws/losses
    if (game.winnerTeamId === game.homeTeamId) {
      homeStanding.wins++;
      awayStanding.losses++;
      
      if (game.endReason === 'penalties') {
        homeStanding.penaltyWins++;
        awayStanding.penaltyLosses++;
      }
    } else if (game.winnerTeamId === game.awayTeamId) {
      awayStanding.wins++;
      homeStanding.losses++;
      
      if (game.endReason === 'penalties') {
        awayStanding.penaltyWins++;
        homeStanding.penaltyLosses++;
      }
    } else {
      // Draw
      homeStanding.draws++;
      awayStanding.draws++;
    }

    // Calculate points
    homeStanding.points += pointsFor(game, game.homeTeamId, rules);
    awayStanding.points += pointsFor(game, game.awayTeamId, rules);
  });

  return Array.from(standingsMap.values())
    .sort((a, b) => {
      // Sort by points (desc), then goal difference (desc), then goals for (desc)
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
}

/**
 * Compute overall player statistics across all matchdays
 */
export function computeOverallPlayerStats(
  events: GameEvent[],
  games: Game[],
  players: Player[]
): OverallPlayerStats[] {
  const baseStats = computePlayerStats(events, games, players);
  const gameMap = new Map(games.map(g => [g.id, g]));
  
  return baseStats.map(stats => {
    // Count unique matchdays played
    const matchdaysPlayed = new Set(
      events
        .filter(e => e.playerId === stats.playerId && e.isActive)
        .map(e => gameMap.get(e.gameId)?.matchdayId)
        .filter(Boolean)
    ).size;

    // Calculate win rate
    const playerGames = events
      .filter(e => e.playerId === stats.playerId && e.isActive)
      .map(e => gameMap.get(e.gameId))
      .filter(g => g && g.status === 'completed');

    const wins = playerGames.filter(game => {
      if (!game) return false;
      // Check if player's team won
      const playerEvents = events.filter(e => 
        e.playerId === stats.playerId && 
        e.gameId === game.id && 
        e.isActive
      );
      if (playerEvents.length === 0) return false;
      
      const playerTeamId = playerEvents[0].teamId;
      return game.winnerTeamId === playerTeamId;
    }).length;

    const winRate = playerGames.length > 0 ? (wins / playerGames.length) * 100 : 0;

    return {
      ...stats,
      matchdaysPlayed,
      winRate,
    };
  });
}

/**
 * Get top scorers from player stats
 */
export function getTopScorers(playerStats: PlayerStats[], limit: number = 10): PlayerStats[] {
  return [...playerStats]
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      return b.goalsPerGame - a.goalsPerGame;
    })
    .slice(0, limit);
}

/**
 * Get players with most assists
 */
export function getTopAssists(playerStats: PlayerStats[], limit: number = 10): PlayerStats[] {
  return [...playerStats]
    .sort((a, b) => {
      if (b.assists !== a.assists) return b.assists - a.assists;
      if (b.goals !== a.goals) return b.goals - a.goals;
      return b.goalsPerGame - a.goalsPerGame;
    })
    .slice(0, limit);
}
