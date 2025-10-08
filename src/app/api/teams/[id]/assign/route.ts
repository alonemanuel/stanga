import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { teams, teamAssignments, players, matchdays } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { logActivity, generateDiff } from '@/lib/activity-log';
import { TeamAssignmentCreateSchema } from '@/lib/validations/team';
import { createId } from '@paralleldrive/cuid2';
import { eq, and, isNull } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/teams/[id]/assign - Assign player to team (auth required)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require authentication
    const { user } = await requireAuth();
    const { id: teamId } = await params;
    
    // Parse request body
    const body = await request.json();
    const assignmentData = TeamAssignmentCreateSchema.parse(body);
    
    // Verify team exists and get matchday info
    const team = await db
      .select({
        id: teams.id,
        matchdayId: teams.matchdayId,
        name: teams.name,
        colorToken: teams.colorToken,
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
    
    const teamInfo = team[0];
    
    // Verify player exists and is active
    const player = await db
      .select()
      .from(players)
      .where(and(
        eq(players.id, assignmentData.playerId),
        eq(players.isActive, true),
        isNull(players.deletedAt)
      ))
      .limit(1);
    
    if (!player.length) {
      return NextResponse.json(
        { error: 'Player not found or inactive' },
        { status: 404 }
      );
    }
    
    // Check for existing assignment (prevent duplicates)
    const existingAssignment = await db
      .select()
      .from(teamAssignments)
      .where(and(
        eq(teamAssignments.teamId, teamId),
        eq(teamAssignments.playerId, assignmentData.playerId),
        isNull(teamAssignments.deletedAt)
      ))
      .limit(1);
    
    if (existingAssignment.length > 0) {
      return NextResponse.json(
        { error: 'Player is already assigned to this team' },
        { status: 409 }
      );
    }
    
    // Create assignment in transaction
    const createdAssignment = await db.transaction(async (tx) => {
      const assignmentId = createId();
      
      const [newAssignment] = await tx
        .insert(teamAssignments)
        .values({
          id: assignmentId,
          matchdayId: teamInfo.matchdayId,
          teamId,
          playerId: assignmentData.playerId,
          position: assignmentData.position,
          positionOrder: assignmentData.positionOrder,
          xPct: assignmentData.xPct,
          yPct: assignmentData.yPct,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning();
      
      // Log activity
      await logActivity({
        entityType: 'team',
        entityId: newAssignment.id,
        action: 'create',
        actorId: user.id,
        changes: generateDiff(null, newAssignment),
        metadata: {
          teamName: teamInfo.name,
          playerName: player[0].name,
          matchdayId: teamInfo.matchdayId,
        },
      });
      
      return newAssignment;
    });
    
    // Revalidate cache
    revalidateTag('teams');
    revalidateTag('team-assignments');
    
    return NextResponse.json({
      data: createdAssignment,
      message: `Successfully assigned ${player[0].name} to ${teamInfo.name}`,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Failed to assign player to team:', error);
    
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
      { error: 'Failed to assign player to team' },
      { status: 500 }
    );
  }
}
