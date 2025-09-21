import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { teams, matchdays } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { logActivity, generateDiff } from '@/lib/activity-log';
import { TeamUpdateSchema } from '@/lib/validations/team';
import { resolveColorHex, resolveTeamName, isValidColorToken } from '@/lib/teams';
import { eq, and, isNull } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/teams/[id] - Get team details (public read access)
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: teamId } = await params;
    
    // Get team with matchday info
    const team = await db
      .select({
        team: teams,
        matchday: matchdays,
      })
      .from(teams)
      .innerJoin(matchdays, eq(teams.matchdayId, matchdays.id))
      .where(and(
        eq(teams.id, teamId),
        isNull(teams.deletedAt),
        isNull(matchdays.deletedAt)
      ))
      .limit(1);
    
    if (!team.length) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      data: team[0],
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
    
  } catch (error) {
    console.error('Failed to fetch team:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

// PATCH /api/teams/[id] - Update team (auth required)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require authentication
    const { user } = await requireAuth();
    const { id: teamId } = await params;
    
    // Get existing team
    const existingTeam = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), isNull(teams.deletedAt)))
      .limit(1);
    
    if (!existingTeam.length) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    const oldTeam = existingTeam[0];
    
    // Parse request body
    const body = await request.json();
    const updateData = TeamUpdateSchema.parse(body);
    
    // Check for color uniqueness if color is being changed
    if (updateData.colorToken && updateData.colorToken !== oldTeam.colorToken) {
      const colorClash = await db
        .select()
        .from(teams)
        .where(and(
          eq(teams.matchdayId, oldTeam.matchdayId),
          eq(teams.colorToken, updateData.colorToken),
          isNull(teams.deletedAt)
        ))
        .limit(1);
      
      if (colorClash.length > 0) {
        return NextResponse.json(
          { error: 'Color already taken by another team in this matchday' },
          { status: 409 }
        );
      }
    }
    
    // Prepare update data
    const updateFields: any = {
      updatedBy: user.id,
      updatedAt: new Date(),
    };
    
    if (updateData.name) {
      updateFields.name = updateData.name;
    }
    
    if (updateData.colorToken) {
      updateFields.colorToken = updateData.colorToken;
      updateFields.colorHex = resolveColorHex(updateData.colorToken);
      // Auto-update name if it matches the old color pattern
      if (isValidColorToken(oldTeam.colorToken) && oldTeam.name === resolveTeamName(oldTeam.colorToken)) {
        updateFields.name = resolveTeamName(updateData.colorToken);
      }
    }
    
    if (updateData.formationJson !== undefined) {
      updateFields.formationJson = updateData.formationJson;
    }
    
    // Update team
    const updatedTeam = await db
      .update(teams)
      .set(updateFields)
      .where(eq(teams.id, teamId))
      .returning();
    
    const newTeam = updatedTeam[0];
    
    // Log activity
    await logActivity({
      entityType: 'team',
      entityId: teamId,
      action: 'update',
      actorId: user.id,
      changes: generateDiff(oldTeam, newTeam),
    });
    
    // Revalidate cache
    revalidateTag('teams');
    
    return NextResponse.json({
      data: newTeam,
      message: 'Team updated successfully',
    });
    
  } catch (error) {
    console.error('Failed to update team:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id] - Soft delete team (auth required)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require authentication
    const { user } = await requireAuth();
    const { id: teamId } = await params;
    
    // Get existing team
    const existingTeam = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), isNull(teams.deletedAt)))
      .limit(1);
    
    if (!existingTeam.length) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    const oldTeam = existingTeam[0];
    
    // Soft delete team
    const deletedTeam = await db
      .update(teams)
      .set({
        deletedAt: new Date(),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId))
      .returning();
    
    const newTeam = deletedTeam[0];
    
    // Log activity
    await logActivity({
      entityType: 'team',
      entityId: teamId,
      action: 'delete',
      actorId: user.id,
      changes: generateDiff(oldTeam, newTeam),
    });
    
    // Revalidate cache
    revalidateTag('teams');
    
    return NextResponse.json({
      data: newTeam,
      message: 'Team deleted successfully',
    });
    
  } catch (error) {
    console.error('Failed to delete team:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
