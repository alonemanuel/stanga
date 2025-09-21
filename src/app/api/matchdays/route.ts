import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { matchdays } from '@/lib/db/schema';
import { MatchdayCreateSchema, MatchdayQuerySchema } from '@/lib/validations/matchday';
import { requireAuth } from '@/lib/auth-guards';
import { logActivity, generateDiff } from '@/lib/activity-log';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, gte, lt, desc, isNull, or } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';

// GET /api/matchdays - List matchdays (auth required)
export async function GET(request: NextRequest) {
  try {
    // Require authentication for all operations
    await requireAuth();
    
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const { status, isPublic, page, limit } = MatchdayQuerySchema.parse(queryParams);
    
    // Build where conditions
    const conditions = [];
    
    // Public filter
    if (isPublic) {
      conditions.push(eq(matchdays.isPublic, true));
    }
    
    // Soft delete filter
    conditions.push(isNull(matchdays.deletedAt));
    
    // Status filter
    const now = new Date();
    if (status === 'upcoming') {
      // Show matchdays that are either in the future OR have status 'upcoming'
      conditions.push(eq(matchdays.status, 'upcoming'));
    } else if (status === 'past') {
      // Show completed or cancelled matchdays, or upcoming ones that are in the past
      conditions.push(
        or(
          eq(matchdays.status, 'completed'),
          eq(matchdays.status, 'cancelled'),
          and(
            eq(matchdays.status, 'upcoming'),
            lt(matchdays.scheduledAt, now)
          )
        )
      );
    } else if (status && ['active', 'completed', 'cancelled'].includes(status)) {
      conditions.push(eq(matchdays.status, status));
    }
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Fetch matchdays
    const matchdaysList = await db
      .select({
        id: matchdays.id,
        name: matchdays.name,
        description: matchdays.description,
        scheduledAt: matchdays.scheduledAt,
        location: matchdays.location,
        maxPlayers: matchdays.maxPlayers,
        status: matchdays.status,
        isPublic: matchdays.isPublic,
        createdAt: matchdays.createdAt,
        updatedAt: matchdays.updatedAt,
      })
      .from(matchdays)
      .where(and(...conditions))
      .orderBy(desc(matchdays.scheduledAt))
      .limit(limit)
      .offset(offset);
    
    // Get total count for pagination
    const totalCount = await db
      .select({ count: matchdays.id })
      .from(matchdays)
      .where(and(...conditions));
    
    const total = totalCount.length;
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      data: matchdaysList,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Failed to fetch matchdays:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch matchdays' },
      { status: 500 }
    );
  }
}

// POST /api/matchdays - Create matchday (auth required)
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { user } = await requireAuth();
    
    // Parse request body
    const body = await request.json();
    const matchdayData = MatchdayCreateSchema.parse(body);
    
    // Create matchday
    const newMatchday = await db
      .insert(matchdays)
      .values({
        id: createId(),
        name: matchdayData.name,
        description: matchdayData.description,
        scheduledAt: new Date(matchdayData.scheduledAt),
        location: matchdayData.location,
        maxPlayers: matchdayData.maxPlayers,
        rules: matchdayData.rules,
        isPublic: matchdayData.isPublic,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();
    
    const createdMatchday = newMatchday[0];
    
    // Log activity
    await logActivity({
      entityType: 'matchday',
      entityId: createdMatchday.id,
      action: 'create',
      actorId: user.id,
      changes: generateDiff(null, createdMatchday),
    });
    
    // Revalidate cache
    revalidateTag('matchdays');
    
    return NextResponse.json({
      data: createdMatchday,
      message: 'Matchday created successfully',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create matchday:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create matchday' },
      { status: 500 }
    );
  }
}
