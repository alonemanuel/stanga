import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { players } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { logActivity, generateDiff } from '@/lib/activity-log';
import { eq, and, isNotNull } from 'drizzle-orm';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/players/[id]/restore - Restore soft deleted player (auth required)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require authentication
    const { user } = await requireAuth();
    const { id } = await params;
    
    // Get existing deleted player
    const existingPlayer = await db
      .select()
      .from(players)
      .where(and(eq(players.id, id), isNotNull(players.deletedAt)))
      .limit(1);
    
    if (!existingPlayer.length) {
      return NextResponse.json(
        { error: 'Deleted player not found' },
        { status: 404 }
      );
    }
    
    const oldPlayer = existingPlayer[0];
    
    // Restore player
    const restoredPlayer = await db
      .update(players)
      .set({
        isActive: true,
        deletedAt: null,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(players.id, id))
      .returning();
    
    const newPlayer = restoredPlayer[0];
    
    // Log activity
    await logActivity({
      entityType: 'player',
      entityId: id,
      action: 'restore',
      actorId: user.id,
      changes: generateDiff(oldPlayer, newPlayer),
    });
    
    return NextResponse.json({
      data: newPlayer,
      message: 'Player restored successfully',
    });
    
  } catch (error) {
    console.error('Failed to restore player:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to restore player' },
      { status: 500 }
    );
  }
}
