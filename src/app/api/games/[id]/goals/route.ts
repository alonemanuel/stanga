import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, gameEvents, players, teams } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { eq, and, isNull } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-log';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/games/:id/goals - Get all goals for a game
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: gameId } = await params;
    
    // Get game details
    const game = await db
      .select({
        game: games,
        homeTeam: teams,
        awayTeam: teams
      })
      .from(games)
      .leftJoin(teams, eq(teams.id, games.homeTeamId))
      .leftJoin(teams, eq(teams.id, games.awayTeamId))
      .where(and(eq(games.id, gameId), isNull(games.deletedAt)))
      .limit(1);
    
    if (!game.length) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    const currentGame = game[0].game;
    
    // Get all goal events for this game
    const goalEvents = await db
      .select({
        event: gameEvents,
        player: players,
      })
      .from(gameEvents)
      .leftJoin(players, eq(gameEvents.playerId, players.id))
      .where(and(
        eq(gameEvents.gameId, gameId),
        eq(gameEvents.eventType, 'goal'),
        eq(gameEvents.isActive, true)
      ))
      .orderBy(gameEvents.createdAt);
    
    // Get assist events for context
    const assistEvents = await db
      .select({
        event: gameEvents,
        player: players,
      })
      .from(gameEvents)
      .leftJoin(players, eq(gameEvents.playerId, players.id))
      .where(and(
        eq(gameEvents.gameId, gameId),
        eq(gameEvents.eventType, 'assist'),
        eq(gameEvents.isActive, true)
      ));
    
    // Map assists by goal event ID
    const assistMap = new Map();
    assistEvents.forEach(assist => {
      const goalEventId = (assist.event.metadata as any)?.goalEventId;
      if (goalEventId) {
        assistMap.set(goalEventId, assist);
      }
    });
    
    // Group goals by team
    const homeTeamGoals: any[] = [];
    const awayTeamGoals: any[] = [];
    
    goalEvents.forEach(({ event, player }) => {
      const assist = assistMap.get(event.id);
      
      const goal = {
        id: event.id,
        playerId: event.playerId || '',
        playerName: player?.name || 'Unknown Player',
        minute: event.minute || 0,
        assistId: assist?.event.playerId || undefined,
        assistName: assist?.player?.name || undefined,
        teamId: event.teamId,
      };
      
      if (event.teamId === currentGame.homeTeamId) {
        homeTeamGoals.push(goal);
      } else if (event.teamId === currentGame.awayTeamId) {
        awayTeamGoals.push(goal);
      }
    });
    
    const response = {
      gameId,
      homeTeamGoals,
      awayTeamGoals,
    };
    
    return NextResponse.json({ data: response });
    
  } catch (error) {
    console.error('Error fetching game goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

// POST /api/games/:id/goals - Add a new goal
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id: gameId } = await params;
    const body = await request.json();
    
    const { teamId, playerId, assistId } = body;
    
    if (!teamId || !playerId) {
      return NextResponse.json(
        { error: 'Team ID and player ID are required' },
        { status: 400 }
      );
    }
    
    if (assistId && assistId === playerId) {
      return NextResponse.json(
        { error: 'Assist player cannot be the same as scorer' },
        { status: 400 }
      );
    }
    
    // Get game details
    const game = await db
      .select()
      .from(games)
      .where(and(eq(games.id, gameId), isNull(games.deletedAt)))
      .limit(1);
    
    if (!game.length) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    const currentGame = game[0];
    
    if (currentGame.status !== 'active') {
      return NextResponse.json(
        { error: 'Game is not active' },
        { status: 400 }
      );
    }
    
    // Validate team belongs to this game
    if (teamId !== currentGame.homeTeamId && teamId !== currentGame.awayTeamId) {
      return NextResponse.json(
        { error: 'Team is not playing in this game' },
        { status: 400 }
      );
    }
    
    // Validate scorer exists and is active
    const scorer = await db
      .select()
      .from(players)
      .where(and(eq(players.id, playerId), isNull(players.deletedAt)))
      .limit(1);
    
    if (!scorer.length || !scorer[0].isActive) {
      return NextResponse.json(
        { error: 'Scorer not found or inactive' },
        { status: 404 }
      );
    }
    
    // Validate assist player if provided
    let assistPlayer = null;
    if (assistId) {
      const assist = await db
        .select()
        .from(players)
        .where(and(eq(players.id, assistId), isNull(players.deletedAt)))
        .limit(1);
      
      if (!assist.length || !assist[0].isActive) {
        return NextResponse.json(
          { error: 'Assist player not found or inactive' },
          { status: 404 }
        );
      }
      assistPlayer = assist[0];
    }
    
    // Calculate current minute
    const gameMinute = currentGame.startedAt 
      ? Math.floor((new Date().getTime() - new Date(currentGame.startedAt).getTime()) / 1000 / 60)
      : 0;
    
    // Create goal event
    const [goalEvent] = await db.insert(gameEvents).values({
      gameId,
      playerId,
      teamId,
      eventType: 'goal',
      minute: gameMinute,
      description: `Goal by ${scorer[0].name}${assistPlayer ? ` (assist: ${assistPlayer.name})` : ''}`,
      metadata: assistId ? { assistId } as any : null,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    
    // Create assist event if provided
    let assistEvent = null;
    if (assistId && assistPlayer) {
      [assistEvent] = await db.insert(gameEvents).values({
        gameId,
        playerId: assistId,
        teamId,
        eventType: 'assist',
        minute: gameMinute,
        description: `Assist by ${assistPlayer.name} for ${scorer[0].name}`,
        metadata: { goalEventId: goalEvent.id } as any,
        createdBy: user.id,
        updatedBy: user.id,
      }).returning();
    }
    
    // Count current goals for each team
    const allGoalEvents = await db
      .select()
      .from(gameEvents)
      .where(and(
        eq(gameEvents.gameId, gameId),
        eq(gameEvents.eventType, 'goal'),
        eq(gameEvents.isActive, true)
      ));
    
    const homeGoals = allGoalEvents.filter(e => e.teamId === currentGame.homeTeamId).length;
    const awayGoals = allGoalEvents.filter(e => e.teamId === currentGame.awayTeamId).length;
    
    // Update game score
    const gameUpdateData: any = {
      homeScore: homeGoals,
      awayScore: awayGoals,
      updatedBy: user.id,
    };
    
    // Check for early finish condition (this logic should match the original)
    const maxGoals = currentGame.maxGoals || 5;
    const shouldEndEarly = Math.max(homeGoals, awayGoals) >= maxGoals;
    
    if (shouldEndEarly) {
      gameUpdateData.status = 'completed';
      gameUpdateData.endedAt = new Date();
      gameUpdateData.endReason = 'early_finish';
      gameUpdateData.winnerTeamId = homeGoals > awayGoals ? currentGame.homeTeamId : currentGame.awayTeamId;
      gameUpdateData.duration = Math.floor((new Date().getTime() - new Date(currentGame.startedAt!).getTime()) / 1000 / 60);
    }
    
    const [updatedGame] = await db
      .update(games)
      .set(gameUpdateData)
      .where(eq(games.id, gameId))
      .returning();
    
    // Log the activity
    await logActivity({
      entityType: 'game',
      entityId: gameId,
      action: 'update',
      actorId: user.id,
      changes: {
        goal_added: {
          scorer: scorer[0].name,
          assist: assistPlayer?.name || null,
          team: teamId,
          minute: gameMinute,
          newScore: `${homeGoals}-${awayGoals}`,
          earlyFinish: shouldEndEarly
        }
      }
    });
    
    const response = {
      id: goalEvent.id,
      playerId,
      playerName: scorer[0].name,
      minute: gameMinute,
      assistId: assistId || undefined,
      assistName: assistPlayer?.name || undefined,
      teamId,
      updatedGame,
      earlyFinish: shouldEndEarly
    };
    
    return NextResponse.json({ data: response }, { status: 201 });
    
  } catch (error) {
    console.error('Error adding goal:', error);
    return NextResponse.json(
      { error: 'Failed to add goal' },
      { status: 500 }
    );
  }
}
