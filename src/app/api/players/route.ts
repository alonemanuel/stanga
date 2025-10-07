import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { players } from '@/lib/db/schema';
import { PlayerCreateSchema, PlayerQuerySchema } from '@/lib/validations/player';
import { requireAuth, requireGroupAdmin } from '@/lib/auth-guards';
import { logActivity, generateDiff } from '@/lib/activity-log';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, ilike, isNull, desc, count } from 'drizzle-orm';

// GET /api/players - List players (auth required)
export async function GET(request: NextRequest) {
  try {
    // Require authentication for all operations
    await requireAuth();
    
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const { query, isActive, page, limit, groupId } = PlayerQuerySchema.parse(queryParams);
    
    // Build where conditions
    const conditions = [];
    
    // Group filter (required for multi-group support)
    if (groupId) {
      conditions.push(eq(players.groupId, groupId));
    }
    
    // Active/inactive filter
    if (isActive) {
      conditions.push(eq(players.isActive, true));
      conditions.push(isNull(players.deletedAt));
    } else {
      // Show deleted players
      conditions.push(eq(players.isActive, false));
    }
    
    // Search by name
    if (query) {
      conditions.push(ilike(players.name, `%${query}%`));
    }
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Fetch players
    const playersList = await db
      .select({
        id: players.id,
        name: players.name,
        isActive: players.isActive,
        createdAt: players.createdAt,
        updatedAt: players.updatedAt,
        deletedAt: players.deletedAt,
      })
      .from(players)
      .where(and(...conditions))
      .orderBy(desc(players.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Get total count for pagination
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(players)
      .where(and(...conditions));
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      data: playersList,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Failed to fetch players:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

// POST /api/players - Create player (auth required)
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { user } = await requireAuth();
    
    // Parse request body
    const body = await request.json();
    const playerData = PlayerCreateSchema.parse(body);
    
    // Ensure groupId is provided
    if (!playerData.groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }
    
    // Validate user is admin of the group
    await requireGroupAdmin(user.id, playerData.groupId);
    
    // Create player
    const newPlayer = await db
      .insert(players)
      .values({
        id: createId(),
        name: playerData.name,
        groupId: playerData.groupId,
        userId: playerData.userId || null,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();
    
    const createdPlayer = newPlayer[0];
    
    // Log activity
    await logActivity({
      entityType: 'player',
      entityId: createdPlayer.id,
      action: 'create',
      actorId: user.id,
      changes: generateDiff(null, createdPlayer),
    });
    
    return NextResponse.json({
      data: createdPlayer,
      message: 'Player created successfully',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create player:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    );
  }
}
