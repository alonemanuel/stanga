import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { teams } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { logActivity, generateDiff } from '@/lib/activity-log';
import { resolveColorHex, resolveTeamName } from '@/lib/teams';
import { TeamCreateSchema } from '@/lib/validations/team';
import { createId } from '@paralleldrive/cuid2';
import { revalidateTag } from 'next/cache';

// POST /api/teams - Create a single team (auth required)
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { user } = await requireAuth();
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = TeamCreateSchema.parse(body);
    
    const { colorToken, matchdayId } = body;
    
    if (!matchdayId) {
      return NextResponse.json(
        { error: 'Matchday ID is required' },
        { status: 400 }
      );
    }
    
    // Create team
    const teamData = {
      id: createId(),
      matchdayId,
      name: resolveTeamName(colorToken),
      colorToken,
      colorHex: resolveColorHex(colorToken),
      formationJson: validatedData.formationJson || null,
      createdBy: user.id,
      updatedBy: user.id,
    };
    
    const [createdTeam] = await db
      .insert(teams)
      .values(teamData)
      .returning();
    
    // Log activity
    await logActivity({
      entityType: 'team',
      entityId: createdTeam.id,
      action: 'create',
      actorId: user.id,
      changes: generateDiff(null, createdTeam),
    });
    
    // Revalidate cache
    revalidateTag('teams');
    revalidateTag('matchdays');
    
    return NextResponse.json({
      data: createdTeam,
      message: 'Team created successfully',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create team:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}
