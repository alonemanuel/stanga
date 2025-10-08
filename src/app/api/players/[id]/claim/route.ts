import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { players } from '@/lib/db/schema';
import { requireAuth, requireGroupMember } from '@/lib/auth-guards';
import { eq, and, isNull } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/players/[id]/claim - Link player to current user
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;

    // Fetch the player
    const player = await db
      .select()
      .from(players)
      .where(and(
        eq(players.id, id),
        eq(players.isActive, true),
        isNull(players.deletedAt)
      ))
      .limit(1);

    if (player.length === 0) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    const targetPlayer = player[0];

    // Check if user is a member of the player's group
    await requireGroupMember(user.id, targetPlayer.groupId);

    // Check if player is already claimed
    if (targetPlayer.userId) {
      return NextResponse.json(
        { error: 'This player is already claimed by another user' },
        { status: 400 }
      );
    }

    // Link the player to the current user
    const updated = await db
      .update(players)
      .set({
        userId: user.id,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(players.id, id))
      .returning();

    return NextResponse.json({
      data: updated[0],
      message: 'Player claimed successfully',
    });

  } catch (error: any) {
    console.error('Failed to claim player:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to claim player' },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/players/[id]/claim - Unlink player from user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;

    // Fetch the player
    const player = await db
      .select()
      .from(players)
      .where(and(
        eq(players.id, id),
        eq(players.isActive, true),
        isNull(players.deletedAt)
      ))
      .limit(1);

    if (player.length === 0) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    const targetPlayer = player[0];

    // Check if user is a member of the player's group
    await requireGroupMember(user.id, targetPlayer.groupId);

    // Check if player is claimed by the current user
    if (targetPlayer.userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only unclaim players that belong to you' },
        { status: 403 }
      );
    }

    // Unlink the player
    const updated = await db
      .update(players)
      .set({
        userId: null,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(players.id, id))
      .returning();

    return NextResponse.json({
      data: updated[0],
      message: 'Player unclaimed successfully',
    });

  } catch (error: any) {
    console.error('Failed to unclaim player:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to unclaim player' },
      { status: error.status || 500 }
    );
  }
}
