import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { matchdays, teams, teamAssignments, players } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { logActivity, generateDiff } from '@/lib/activity-log';
import { getAvailableColors, resolveColorHex, resolveTeamName } from '@/lib/teams';
import { createId } from '@paralleldrive/cuid2';
import { eq, and, isNull } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/matchdays/[id]/teams - Initialize 3 teams with unique colors (auth required)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require authentication
    const { user } = await requireAuth();
    const { id: matchdayId } = await params;
    
    // Verify matchday exists and is not deleted
    const matchday = await db
      .select()
      .from(matchdays)
      .where(and(
        eq(matchdays.id, matchdayId),
        isNull(matchdays.deletedAt)
      ))
      .limit(1);
    
    if (!matchday.length) {
      return NextResponse.json(
        { error: 'Matchday not found' },
        { status: 404 }
      );
    }
    
    // Check if teams already exist for this matchday
    const existingTeams = await db
      .select()
      .from(teams)
      .where(and(
        eq(teams.matchdayId, matchdayId),
        isNull(teams.deletedAt)
      ));
    
    if (existingTeams.length > 0) {
      return NextResponse.json(
        { error: 'Teams already exist for this matchday' },
        { status: 409 }
      );
    }
    
    // Get the number of teams to create from matchday settings
    const numberOfTeams = matchday[0].numberOfTeams;
    
    // Get available colors (limit to the number of teams needed)
    const availableColors = getAvailableColors().slice(0, numberOfTeams);
    
    // Create teams in a transaction
    const createdTeams = await db.transaction(async (tx) => {
      const newTeams = [];
      
      for (const colorToken of availableColors) {
        const teamData = {
          id: createId(),
          matchdayId,
          name: resolveTeamName(colorToken),
          colorToken,
          colorHex: resolveColorHex(colorToken),
          formationJson: null, // Default formation can be set later
          createdBy: user.id,
          updatedBy: user.id,
        };
        
        const [createdTeam] = await tx
          .insert(teams)
          .values(teamData)
          .returning();
        
        newTeams.push(createdTeam);
        
        // Log activity for each team creation
        await logActivity({
          entityType: 'team',
          entityId: createdTeam.id,
          action: 'create',
          actorId: user.id,
          changes: generateDiff(null, createdTeam),
        });
      }
      
      return newTeams;
    });
    
    // Revalidate cache
    revalidateTag('teams');
    revalidateTag('matchdays');
    
    return NextResponse.json({
      data: createdTeams,
      message: `Successfully created ${createdTeams.length} teams for matchday`,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create teams:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create teams' },
      { status: 500 }
    );
  }
}

// GET /api/matchdays/[id]/teams - Get teams for a matchday (public read access)
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: matchdayId } = await params;
    
    // Verify matchday exists and is not deleted
    const matchday = await db
      .select()
      .from(matchdays)
      .where(and(
        eq(matchdays.id, matchdayId),
        isNull(matchdays.deletedAt)
      ))
      .limit(1);
    
    if (!matchday.length) {
      return NextResponse.json(
        { error: 'Matchday not found' },
        { status: 404 }
      );
    }
    
    // Get teams for this matchday
    const matchdayTeams = await db
      .select()
      .from(teams)
      .where(and(
        eq(teams.matchdayId, matchdayId),
        isNull(teams.deletedAt)
      ))
      .orderBy(teams.createdAt);

    // Get team assignments for each team
    const teamsWithAssignments = await Promise.all(
      matchdayTeams.map(async (team) => {
        const assignments = await db
          .select({
            id: teamAssignments.id,
            matchdayId: teamAssignments.matchdayId,
            teamId: teamAssignments.teamId,
            playerId: teamAssignments.playerId,
            position: teamAssignments.position,
            positionOrder: teamAssignments.positionOrder,
            xPct: teamAssignments.xPct,
            yPct: teamAssignments.yPct,
            createdAt: teamAssignments.createdAt,
            createdBy: teamAssignments.createdBy,
            deletedAt: teamAssignments.deletedAt,
            player: {
              id: players.id,
              name: players.name,
              isActive: players.isActive,
            },
          })
          .from(teamAssignments)
          .innerJoin(players, eq(teamAssignments.playerId, players.id))
          .where(and(
            eq(teamAssignments.teamId, team.id),
            isNull(teamAssignments.deletedAt),
            isNull(players.deletedAt)
          ))
          .orderBy(teamAssignments.positionOrder);

        return {
          ...team,
          assignments,
          playerCount: assignments.length,
        };
      })
    );
    
    return NextResponse.json({
      data: teamsWithAssignments,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    });
    
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}
