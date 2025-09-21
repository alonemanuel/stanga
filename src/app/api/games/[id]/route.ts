import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, gameEvents, teams, players } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-log';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/games/:id - Get game details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: gameId } = await params;
    
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
    
    // Get team details and events
    const [homeTeam, awayTeam, events] = await Promise.all([
      db.select().from(teams).where(eq(teams.id, game[0].homeTeamId)).limit(1),
      db.select().from(teams).where(eq(teams.id, game[0].awayTeamId)).limit(1),
      db
        .select({
          event: gameEvents,
          player: players
        })
        .from(gameEvents)
        .leftJoin(players, eq(gameEvents.playerId, players.id))
        .where(and(
          eq(gameEvents.gameId, gameId),
          eq(gameEvents.isActive, true)
        ))
        .orderBy(desc(gameEvents.createdAt))
    ]);
    
    const gameWithDetails = {
      ...game[0],
      homeTeam: homeTeam[0] || null,
      awayTeam: awayTeam[0] || null,
      events: events.map(e => ({
        ...e.event,
        player: e.player
      }))
    };
    
    return NextResponse.json({ data: gameWithDetails });
    
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}

// PATCH /api/games/:id - Update game (end game)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id: gameId } = await params;
    const body = await request.json();
    
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
    
    // Only allow ending active games
    if (currentGame.status !== 'active') {
      return NextResponse.json(
        { error: 'Game is not active' },
        { status: 400 }
      );
    }
    
    const { endReason, winnerTeamId } = body;
    
    if (!endReason) {
      return NextResponse.json(
        { error: 'End reason is required' },
        { status: 400 }
      );
    }
    
    // Calculate duration if game is ending
    const duration = currentGame.startedAt 
      ? Math.floor((new Date().getTime() - new Date(currentGame.startedAt).getTime()) / 1000 / 60)
      : null;
    
    const updateData = {
      status: 'completed' as const,
      endedAt: new Date(),
      endReason,
      winnerTeamId: winnerTeamId || null,
      duration,
      updatedBy: user.id,
    };
    
    const [updatedGame] = await db
      .update(games)
      .set(updateData)
      .where(eq(games.id, gameId))
      .returning();
    
    // Log the activity
    await logActivity({
      entityType: 'game',
      entityId: gameId,
      action: 'update',
      actorId: user.id,
      changes: {
        from: {
          status: currentGame.status,
          endedAt: currentGame.endedAt,
          endReason: currentGame.endReason,
          winnerTeamId: currentGame.winnerTeamId
        },
        to: {
          status: updateData.status,
          endedAt: updateData.endedAt,
          endReason: updateData.endReason,
          winnerTeamId: updateData.winnerTeamId
        }
      }
    });
    
    return NextResponse.json({ data: updatedGame });
    
  } catch (error) {
    console.error('Error updating game:', error);
    return NextResponse.json(
      { error: 'Failed to update game' },
      { status: 500 }
    );
  }
}
