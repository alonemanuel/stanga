import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, penaltyShootouts, penaltyKicks, players } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-log';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/games/:id/penalties - Start penalty shootout
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id: gameId } = await params;
    
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
        { error: 'Game must be active to start penalties' },
        { status: 400 }
      );
    }
    
    // Check if game is tied (required for penalties)
    if (currentGame.homeScore !== currentGame.awayScore) {
      return NextResponse.json(
        { error: 'Penalties can only be started for tied games' },
        { status: 400 }
      );
    }
    
    // Check if penalty shootout already exists
    const existingShootout = await db
      .select()
      .from(penaltyShootouts)
      .where(eq(penaltyShootouts.gameId, gameId))
      .limit(1);
    
    if (existingShootout.length) {
      return NextResponse.json(
        { error: 'Penalty shootout already exists for this game' },
        { status: 400 }
      );
    }
    
    // Create penalty shootout
    const [shootout] = await db.insert(penaltyShootouts).values({
      gameId,
      homeTeamScore: 0,
      awayTeamScore: 0,
      status: 'active',
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    
    // Log the activity
    await logActivity({
      entityType: 'game',
      entityId: gameId,
      action: 'update',
      actorId: user.id,
      changes: {
        penalty_shootout_started: {
          shootoutId: shootout.id,
          homeScore: currentGame.homeScore,
          awayScore: currentGame.awayScore
        }
      }
    });
    
    return NextResponse.json({ data: shootout }, { status: 201 });
    
  } catch (error) {
    console.error('Error starting penalty shootout:', error);
    return NextResponse.json(
      { error: 'Failed to start penalty shootout' },
      { status: 500 }
    );
  }
}

// GET /api/games/:id/penalties - Get penalty shootout details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: gameId } = await params;
    
    const shootout = await db
      .select()
      .from(penaltyShootouts)
      .where(eq(penaltyShootouts.gameId, gameId))
      .limit(1);
    
    if (!shootout.length) {
      return NextResponse.json(
        { error: 'No penalty shootout found for this game' },
        { status: 404 }
      );
    }
    
    // Get all penalty kicks for this shootout
    const kicks = await db
      .select({
        kick: penaltyKicks,
        player: players
      })
      .from(penaltyKicks)
      .leftJoin(players, eq(penaltyKicks.playerId, players.id))
      .where(eq(penaltyKicks.shootoutId, shootout[0].id))
      .orderBy(penaltyKicks.kickOrder);
    
    const shootoutWithKicks = {
      ...shootout[0],
      kicks: kicks.map(k => ({
        ...k.kick,
        player: k.player
      }))
    };
    
    return NextResponse.json({ data: shootoutWithKicks });
    
  } catch (error) {
    console.error('Error fetching penalty shootout:', error);
    return NextResponse.json(
      { error: 'Failed to fetch penalty shootout' },
      { status: 500 }
    );
  }
}
