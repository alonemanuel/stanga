import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, gameEvents, players, teams, matchdays } from '@/lib/db/schema';
import { 
  computeOverallPlayerStats, 
  computeStandings, 
  getTopScorers, 
  getTopAssists,
  type Rules 
} from '@/lib/stats';
import { requireAuth } from '@/lib/auth-guards';
import { eq, and, isNull } from 'drizzle-orm';

// GET /api/stats/overall - Get overall statistics across all matchdays (auth required)
export async function GET(request: NextRequest) {
  try {
    // Require authentication for all operations
    await requireAuth();
    
    // Get groupId from query params
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    
    // Build conditions
    const matchdayConditions = [
      eq(games.status, 'completed'),
      isNull(games.deletedAt),
      isNull(matchdays.deletedAt),
    ];
    
    // Add group filter if provided
    if (groupId) {
      matchdayConditions.push(eq(matchdays.groupId, groupId));
    }
    
    // Fetch all completed games with their matchday rules
    const completedGames = await db
      .select({
        id: games.id,
        homeTeamId: games.homeTeamId,
        awayTeamId: games.awayTeamId,
        homeScore: games.homeScore,
        awayScore: games.awayScore,
        winnerTeamId: games.winnerTeamId,
        endReason: games.endReason,
        status: games.status,
        matchdayId: games.matchdayId,
        rules: matchdays.rules,
      })
      .from(games)
      .innerJoin(matchdays, eq(games.matchdayId, matchdays.id))
      .where(and(...matchdayConditions));

    // Fetch all active game events
    const allEvents = await db
      .select()
      .from(gameEvents)
      .where(and(
        eq(gameEvents.isActive, true),
        isNull(gameEvents.deletedAt)
      ));

    // Fetch all active players
    const playerConditions = [
      eq(players.isActive, true),
      isNull(players.deletedAt),
    ];
    
    // Add group filter if provided
    if (groupId) {
      playerConditions.push(eq(players.groupId, groupId));
    }
    
    const allPlayers = await db
      .select({
        id: players.id,
        name: players.name,
      })
      .from(players)
      .where(and(...playerConditions
      ));

    // Fetch all teams
    const allTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        matchdayId: teams.matchdayId,
      })
      .from(teams)
      .where(and(
        eq(teams.isActive, true),
        isNull(teams.deletedAt)
      ));

    // Convert games to the format expected by stats functions
    const gamesForStats = completedGames.map(game => ({
      id: game.id,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      winnerTeamId: game.winnerTeamId,
      endReason: game.endReason,
      status: game.status,
      matchdayId: game.matchdayId,
    }));

    // Convert events to the format expected by stats functions
    const eventsForStats = allEvents.map(event => ({
      id: event.id,
      gameId: event.gameId,
      playerId: event.playerId,
      teamId: event.teamId,
      eventType: event.eventType,
      minute: event.minute,
      isActive: event.isActive,
    }));

    // Convert players to the format expected by stats functions
    const playersForStats = allPlayers.map(player => ({
      id: player.id,
      name: player.name,
    }));

    // Convert teams to the format expected by stats functions
    const teamsForStats = allTeams.map(team => ({
      id: team.id,
      name: team.name,
      matchdayId: team.matchdayId,
    }));

    // Compute overall player statistics
    const playerStats = computeOverallPlayerStats(
      eventsForStats,
      gamesForStats,
      playersForStats
    );

    // Get top performers
    const topScorers = getTopScorers(playerStats, 10);
    const topAssists = getTopAssists(playerStats, 10);

    // Compute overall standings (aggregate across all matchdays)
    // For overall standings, we'll use the most common rules from recent matchdays
    const defaultRules: Rules = {
      points: {
        loss: 0,
        draw: 1,
        penalty_bonus_win: 2,
        regulation_win: 3,
      },
      penalty_win_weight: 0.5,
    };

    // Use rules from the most recent matchday if available
    const rules = completedGames.length > 0 
      ? (completedGames[0].rules as Rules) 
      : defaultRules;

    // Compute standings for each matchday and aggregate
    const matchdayStandings = new Map<string, any>();
    
    // Group games by matchday
    const gamesByMatchday = new Map<string, typeof gamesForStats>();
    gamesForStats.forEach(game => {
      if (!gamesByMatchday.has(game.matchdayId)) {
        gamesByMatchday.set(game.matchdayId, []);
      }
      gamesByMatchday.get(game.matchdayId)!.push(game);
    });

    // Compute standings for each matchday
    gamesByMatchday.forEach((matchdayGames, matchdayId) => {
      const matchdayTeams = teamsForStats.filter(team => team.matchdayId === matchdayId);
      const standings = computeStandings(matchdayGames, matchdayTeams, rules);
      matchdayStandings.set(matchdayId, standings);
    });

    // Calculate summary statistics
    const totalGames = gamesForStats.length;
    const totalGoals = eventsForStats.filter(e => 
      e.eventType === 'goal' || e.eventType === 'penalty_goal'
    ).length;
    const totalPlayers = playerStats.length;
    const totalMatchdays = new Set(gamesForStats.map(g => g.matchdayId)).size;

    const response = {
      summary: {
        totalGames,
        totalGoals,
        totalPlayers,
        totalMatchdays,
        averageGoalsPerGame: totalGames > 0 ? totalGoals / totalGames : 0,
      },
      topScorers,
      topAssists,
      playerStats: playerStats.slice(0, 50), // Limit to top 50 for performance
      matchdayStandings: Object.fromEntries(matchdayStandings),
    };

    return NextResponse.json({
      data: response,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5min cache, 10min stale
      },
    });

  } catch (error) {
    console.error('Failed to fetch overall stats:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch overall stats' },
      { status: 500 }
    );
  }
}
