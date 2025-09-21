import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, teams, teamAssignments, matchdays, gameEvents } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-log';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/matchdays/:id/games/start - Start a new game
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // TODO: Re-enable auth once session issue is resolved
    // const user = await requireAuth();
    const user = { id: 'temp-user-id' }; // Temporary bypass
    const { id: matchdayId } = await params;
    
    const body = await request.json();
    const { homeTeamId, awayTeamId, force = false } = body;
    
    if (!homeTeamId || !awayTeamId) {
      return NextResponse.json(
        { error: 'Both homeTeamId and awayTeamId are required' },
        { status: 400 }
      );
    }
    
    if (homeTeamId === awayTeamId) {
      return NextResponse.json(
        { error: 'Home and away teams must be different' },
        { status: 400 }
      );
    }
    
    // Validate teams exist and belong to this matchday
    const [homeTeam, awayTeam] = await Promise.all([
      db.query.teams.findFirst({
        where: and(eq(teams.id, homeTeamId), eq(teams.matchdayId, matchdayId), isNull(teams.deletedAt))
      }),
      db.query.teams.findFirst({
        where: and(eq(teams.id, awayTeamId), eq(teams.matchdayId, matchdayId), isNull(teams.deletedAt))
      })
    ]);
    
    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: 'One or both teams not found for this matchday' },
        { status: 404 }
      );
    }
    
    // Check if teams have enough players assigned
    const [homePlayerCount, awayPlayerCount] = await Promise.all([
      db.query.teamAssignments.findMany({
        where: and(
          eq(teamAssignments.teamId, homeTeamId),
          eq(teamAssignments.matchdayId, matchdayId),
          eq(teamAssignments.isActive, true),
          isNull(teamAssignments.deletedAt)
        )
      }).then(assignments => assignments.length),
      db.query.teamAssignments.findMany({
        where: and(
          eq(teamAssignments.teamId, awayTeamId),
          eq(teamAssignments.matchdayId, matchdayId),
          eq(teamAssignments.isActive, true),
          isNull(teamAssignments.deletedAt)
        )
      }).then(assignments => assignments.length)
    ]);
    
    // Get matchday to check team size requirements
    const matchday = await db.query.matchdays.findFirst({
      where: eq(matchdays.id, matchdayId)
    });
    
    if (!matchday) {
      return NextResponse.json(
        { error: 'Matchday not found' },
        { status: 404 }
      );
    }
    
    const requiredTeamSize = matchday.rules.team_size || 5;
    
    if (!force && (homePlayerCount < requiredTeamSize || awayPlayerCount < requiredTeamSize)) {
      return NextResponse.json(
        { 
          error: `Both teams must have at least ${requiredTeamSize} players assigned`,
          code: 'INSUFFICIENT_PLAYERS',
          details: {
            homeTeamPlayers: homePlayerCount,
            awayTeamPlayers: awayPlayerCount,
            required: requiredTeamSize,
            homeTeamName: homeTeam.name,
            awayTeamName: awayTeam.name
          }
        },
        { status: 400 }
      );
    }
    
    // Get the next queue position
    const lastGame = await db.query.games.findFirst({
      where: eq(games.matchdayId, matchdayId),
      orderBy: [desc(games.queuePosition)]
    });
    
    const nextQueuePosition = (lastGame?.queuePosition || 0) + 1;
    
    // Create the game
    const [newGame] = await db.insert(games).values({
      matchdayId,
      homeTeamId,
      awayTeamId,
      status: 'active',
      startedAt: new Date(),
      maxGoals: matchday.rules.max_goals_to_win || 5,
      queuePosition: nextQueuePosition,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    
    // Log the activity
    await logActivity({
      entityType: 'game',
      entityId: newGame.id,
      action: 'create',
      actorId: user.id,
      changes: {
        created: {
          matchdayId,
          homeTeamId,
          awayTeamId,
          status: 'active',
          queuePosition: nextQueuePosition
        }
      }
    });
    
    // Return the game with team information
    const gameWithTeams = {
      ...newGame,
      homeTeam,
      awayTeam,
      matchday: {
        id: matchday.id,
        name: matchday.name,
        rules: matchday.rules
      }
    };
    
    return NextResponse.json({ data: gameWithTeams }, { status: 201 });
    
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json(
      { error: 'Failed to start game' },
      { status: 500 }
    );
  }
}

// GET /api/matchdays/:id/games - Get games for a matchday
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: matchdayId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    let whereConditions = [
      eq(games.matchdayId, matchdayId),
      isNull(games.deletedAt)
    ];
    
    if (status) {
      whereConditions.push(eq(games.status, status));
    }
    
    const matchdayGames = await db
      .select()
      .from(games)
      .where(and(...whereConditions))
      .orderBy(desc(games.createdAt));
    
    // Get team details for each game
    const gamesWithTeams = await Promise.all(
      matchdayGames.map(async (game) => {
        const [homeTeam, awayTeam] = await Promise.all([
          db.select().from(teams).where(eq(teams.id, game.homeTeamId)).limit(1),
          db.select().from(teams).where(eq(teams.id, game.awayTeamId)).limit(1)
        ]);
        
        return {
          ...game,
          homeTeam: homeTeam[0] || null,
          awayTeam: awayTeam[0] || null
        };
      })
    );
    
    return NextResponse.json({ data: gamesWithTeams });
    
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}
