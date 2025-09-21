import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { teamAssignments, teams, players } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { logActivity, generateDiff } from '@/lib/activity-log';
import { eq, and, isNull } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';

interface RouteParams {
  params: {
    id: string;
  };
}

// DELETE /api/team-assignments/[id] - Unassign player from team (soft delete, auth required)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require authentication
    const { user } = await requireAuth();
    const { id: assignmentId } = await params;
    
    // Get existing assignment with team and player info
    const existingAssignment = await db
      .select({
        assignment: teamAssignments,
        teamName: teams.name,
        playerName: players.name,
      })
      .from(teamAssignments)
      .innerJoin(teams, eq(teamAssignments.teamId, teams.id))
      .innerJoin(players, eq(teamAssignments.playerId, players.id))
      .where(and(
        eq(teamAssignments.id, assignmentId),
        isNull(teamAssignments.deletedAt)
      ))
      .limit(1);
    
    if (!existingAssignment.length) {
      return NextResponse.json(
        { error: 'Team assignment not found' },
        { status: 404 }
      );
    }
    
    const { assignment: oldAssignment, teamName, playerName } = existingAssignment[0];
    
    // Soft delete assignment
    const deletedAssignment = await db
      .update(teamAssignments)
      .set({
        deletedAt: new Date(),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(teamAssignments.id, assignmentId))
      .returning();
    
    const newAssignment = deletedAssignment[0];
    
    // Log activity
    await logActivity({
      entityType: 'team_assignment',
      entityId: assignmentId,
      action: 'delete',
      actorId: user.id,
      changes: generateDiff(oldAssignment, newAssignment),
      metadata: {
        teamName,
        playerName,
        matchdayId: oldAssignment.matchdayId,
      },
    });
    
    // Revalidate cache
    revalidateTag('teams');
    revalidateTag('team-assignments');
    
    return NextResponse.json({
      data: newAssignment,
      message: `Successfully unassigned ${playerName} from ${teamName}`,
    });
    
  } catch (error) {
    console.error('Failed to unassign player from team:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to unassign player from team' },
      { status: 500 }
    );
  }
}

// GET /api/team-assignments/[id] - Get team assignment details (public read access)
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: assignmentId } = await params;
    
    // Get assignment with team and player info
    const assignment = await db
      .select({
        assignment: teamAssignments,
        team: teams,
        player: players,
      })
      .from(teamAssignments)
      .innerJoin(teams, eq(teamAssignments.teamId, teams.id))
      .innerJoin(players, eq(teamAssignments.playerId, players.id))
      .where(and(
        eq(teamAssignments.id, assignmentId),
        isNull(teamAssignments.deletedAt)
      ))
      .limit(1);
    
    if (!assignment.length) {
      return NextResponse.json(
        { error: 'Team assignment not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      data: assignment[0],
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
    
  } catch (error) {
    console.error('Failed to fetch team assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team assignment' },
      { status: 500 }
    );
  }
}
