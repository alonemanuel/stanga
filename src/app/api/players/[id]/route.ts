import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { players } from '@/lib/db/schema';
import { PlayerUpdateSchema } from '@/lib/validations/player';
import { requireAuth } from '@/lib/auth-guards';
import { logActivity, generateDiff } from '@/lib/activity-log';
import { eq, and, isNull } from 'drizzle-orm';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/players/[id] - Get single player (public read access)
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    
    const player = await db
      .select()
      .from(players)
      .where(eq(players.id, id))
      .limit(1);
    
    if (!player.length) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      data: player[0],
    });
  } catch (error) {
    console.error('Failed to fetch player:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player' },
      { status: 500 }
    );
  }
}

// PATCH /api/players/[id] - Update player (auth required)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require authentication
    const { user } = await requireAuth();
    const { id } = await params;
    
    // Get existing player
    const existingPlayer = await db
      .select()
      .from(players)
      .where(and(eq(players.id, id), isNull(players.deletedAt)))
      .limit(1);
    
    if (!existingPlayer.length) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    const oldPlayer = existingPlayer[0];
    
    // Parse request body
    const body = await request.json();
    const updateData = PlayerUpdateSchema.parse(body);
    
    // Update player
    const updatedPlayer = await db
      .update(players)
      .set({
        ...updateData,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(players.id, id))
      .returning();
    
    const newPlayer = updatedPlayer[0];
    
    // Log activity
    await logActivity({
      entityType: 'player',
      entityId: id,
      action: 'update',
      actorId: user.id,
      changes: generateDiff(oldPlayer, newPlayer),
    });
    
    return NextResponse.json({
      data: newPlayer,
      message: 'Player updated successfully',
    });
    
  } catch (error) {
    console.error('Failed to update player:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}

// DELETE /api/players/[id] - Soft delete player (auth required)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require authentication
    const { user } = await requireAuth();
    const { id } = await params;
    
    // Get existing player
    const existingPlayer = await db
      .select()
      .from(players)
      .where(and(eq(players.id, id), isNull(players.deletedAt)))
      .limit(1);
    
    if (!existingPlayer.length) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    const oldPlayer = existingPlayer[0];
    
    // Soft delete player
    const deletedPlayer = await db
      .update(players)
      .set({
        isActive: false,
        deletedAt: new Date(),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(players.id, id))
      .returning();
    
    const newPlayer = deletedPlayer[0];
    
    // Log activity
    await logActivity({
      entityType: 'player',
      entityId: id,
      action: 'delete',
      actorId: user.id,
      changes: generateDiff(oldPlayer, newPlayer),
    });
    
    return NextResponse.json({
      data: newPlayer,
      message: 'Player deleted successfully',
    });
    
  } catch (error) {
    console.error('Failed to delete player:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete player' },
      { status: 500 }
    );
  }
}
