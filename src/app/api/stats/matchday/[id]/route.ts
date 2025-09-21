import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, gameEvents, players, teams, matchdays } from '@/lib/db/schema';
import { 
  computePlayerStats, 
  computeStandings, 
  getTopScorers, 
  getTopAssists,
  type Rules 
} from '@/lib/stats';
import { eq, and, isNull } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/stats/matchday/[id] - Get statistics for a specific matchday
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Fetch the matchday to get rules
    const matchday = await db
      .select({
        id: matchdays.id,
        name: matchdays.name,
        rules: matchdays.rules,
        scheduledAt: matchdays.scheduledAt,
        status: matchdays.status,
      })
      .from(matchdays)
      .where(and(
        eq(matchdays.id, id),
        isNull(matchdays.deletedAt)
      ))
      .limit(1);

    if (!matchday.length) {
      return NextResponse.json(
        { error: 'Matchday not found' },
        { status: 404 }
      );
    }

    const matchdayData = matchday[0];
    const rules = matchdayData.rules as Rules;

    // Fetch games for this matchday
    const matchdayGames = await db
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
        startedAt: games.startedAt,
        endedAt: games.endedAt,
      })
      .from(games)
      .where(and(
        eq(games.matchdayId, id),
        isNull(games.deletedAt)
      ));

    // Fetch game events for games in this matchday
    const gameIds = matchdayGames.map(g => g.id);
    const matchdayEvents = gameIds.length > 0 ? await db
      .select()
      .from(gameEvents)
      .where(and(
        eq(gameEvents.isActive, true),
        isNull(gameEvents.deletedAt)
      )) : [];

    // Filter events to only include those from this matchday's games
    const filteredEvents = matchdayEvents.filter(event => 
      gameIds.includes(event.gameId)
    );

    // Fetch teams for this matchday
    const matchdayTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        matchdayId: teams.matchdayId,
        color: teams.colorToken,
      })
      .from(teams)
      .where(and(
        eq(teams.matchdayId, id),
        eq(teams.isActive, true),
        isNull(teams.deletedAt)
      ));

    // Fetch players who participated in this matchday
    const playerIds = [...new Set(filteredEvents
      .filter(e => e.playerId)
      .map(e => e.playerId!)
    )];

    const matchdayPlayers = playerIds.length > 0 ? await db
      .select({
        id: players.id,
        name: players.name,
        nickname: players.nickname,
      })
      .from(players)
      .where(and(
        eq(players.isActive, true),
        isNull(players.deletedAt)
      )) : [];

    // Filter to only players who actually participated
    const participatingPlayers = matchdayPlayers.filter(player => 
      playerIds.includes(player.id)
    );

    // Convert to stats function format
    const gamesForStats = matchdayGames.map(game => ({
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

    const eventsForStats = filteredEvents.map(event => ({
      id: event.id,
      gameId: event.gameId,
      playerId: event.playerId,
      teamId: event.teamId,
      eventType: event.eventType,
      minute: event.minute,
      isActive: event.isActive,
    }));

    const playersForStats = participatingPlayers.map(player => ({
      id: player.id,
      name: player.name,
      nickname: player.nickname,
    }));

    const teamsForStats = matchdayTeams.map(team => ({
      id: team.id,
      name: team.name,
      matchdayId: team.matchdayId,
    }));

    // Compute statistics
    const playerStats = computePlayerStats(
      eventsForStats,
      gamesForStats,
      playersForStats
    );

    const standings = computeStandings(
      gamesForStats,
      teamsForStats,
      rules
    );

    const topScorers = getTopScorers(playerStats, 5);
    const topAssists = getTopAssists(playerStats, 5);

    // Calculate matchday summary
    const completedGames = gamesForStats.filter(g => g.status === 'completed');
    const totalGoals = eventsForStats.filter(e => 
      e.eventType === 'goal' || e.eventType === 'penalty_goal'
    ).length;

    const response = {
      matchday: {
        id: matchdayData.id,
        name: matchdayData.name,
        scheduledAt: matchdayData.scheduledAt,
        status: matchdayData.status,
        rules,
      },
      summary: {
        totalGames: matchdayGames.length,
        completedGames: completedGames.length,
        totalGoals,
        totalPlayers: participatingPlayers.length,
        totalTeams: matchdayTeams.length,
        averageGoalsPerGame: completedGames.length > 0 ? totalGoals / completedGames.length : 0,
      },
      standings,
      topScorers,
      topAssists,
      playerStats,
      games: matchdayGames.map(game => ({
        ...game,
        homeTeam: matchdayTeams.find(t => t.id === game.homeTeamId),
        awayTeam: matchdayTeams.find(t => t.id === game.awayTeamId),
      })),
    };

    return NextResponse.json({
      data: response,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=360', // 3min cache, 6min stale
      },
    });

  } catch (error) {
    console.error('Failed to fetch matchday stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matchday stats' },
      { status: 500 }
    );
  }
}
