import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { matchdays } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { logActivity, generateDiff } from '@/lib/activity-log';
import { MatchdayUpdateSchema } from '@/lib/validations/matchday';
import { eq, and, isNull } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/matchdays/[id] - Get single matchday (public read access)
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    
    const matchday = await db
      .select()
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
    
    return NextResponse.json({
      data: matchday[0],
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Failed to fetch matchday:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matchday' },
      { status: 500 }
    );
  }
}

// PATCH /api/matchdays/[id] - Update matchday (auth required)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require authentication
    const { user } = await requireAuth();
    const { id } = await params;
    
    // Get existing matchday
    const existingMatchday = await db
      .select()
      .from(matchdays)
      .where(and(eq(matchdays.id, id), isNull(matchdays.deletedAt)))
      .limit(1);
    
    if (!existingMatchday.length) {
      return NextResponse.json(
        { error: 'Matchday not found' },
        { status: 404 }
      );
    }
    
    const oldMatchday = existingMatchday[0];
    
    // Parse request body
    const body = await request.json();
    const updateData = MatchdayUpdateSchema.parse(body);
    
    // Update matchday
    const updatedMatchday = await db
      .update(matchdays)
      .set({
        ...updateData,
        scheduledAt: updateData.scheduledAt ? new Date(updateData.scheduledAt) : undefined,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(matchdays.id, id))
      .returning();
    
    const newMatchday = updatedMatchday[0];
    
    // Log activity
    await logActivity({
      entityType: 'matchday',
      entityId: id,
      action: 'update',
      actorId: user.id,
      changes: generateDiff(oldMatchday, newMatchday),
    });
    
    // Revalidate cache
    revalidateTag('matchdays');
    
    return NextResponse.json({
      data: newMatchday,
      message: 'Matchday updated successfully',
    });
    
  } catch (error) {
    console.error('Failed to update matchday:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update matchday' },
      { status: 500 }
    );
  }
}

// DELETE /api/matchdays/[id] - Soft delete matchday (auth required)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require authentication
    const { user } = await requireAuth();
    const { id } = await params;
    
    // Get existing matchday
    const existingMatchday = await db
      .select()
      .from(matchdays)
      .where(and(eq(matchdays.id, id), isNull(matchdays.deletedAt)))
      .limit(1);
    
    if (!existingMatchday.length) {
      return NextResponse.json(
        { error: 'Matchday not found' },
        { status: 404 }
      );
    }
    
    const oldMatchday = existingMatchday[0];
    
    // Soft delete matchday
    const deletedMatchday = await db
      .update(matchdays)
      .set({
        status: 'cancelled',
        deletedAt: new Date(),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(matchdays.id, id))
      .returning();
    
    const newMatchday = deletedMatchday[0];
    
    // Log activity
    await logActivity({
      entityType: 'matchday',
      entityId: id,
      action: 'delete',
      actorId: user.id,
      changes: generateDiff(oldMatchday, newMatchday),
    });
    
    // Revalidate cache
    revalidateTag('matchdays');
    
    return NextResponse.json({
      data: newMatchday,
      message: 'Matchday deleted successfully',
    });
    
  } catch (error) {
    console.error('Failed to delete matchday:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete matchday' },
      { status: 500 }
    );
  }
}
