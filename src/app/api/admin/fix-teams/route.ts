import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { matchdays, teams } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-guards';

// POST /api/admin/fix-teams - Fix teams for all matchdays (admin only)
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { user } = await requireAuth();
    
    const results = [];
    
    // Get all matchdays
    const allMatchdays = await db
      .select()
      .from(matchdays)
      .where(isNull(matchdays.deletedAt));
    
    console.log(`📊 Found ${allMatchdays.length} matchdays`);
    
    for (const matchday of allMatchdays) {
      console.log(`\n🏟️  Processing matchday: ${matchday.id}`);
      
      // Get teams for this matchday
      const matchdayTeams = await db
        .select()
        .from(teams)
        .where(and(
          eq(teams.matchdayId, matchday.id),
          isNull(teams.deletedAt)
        ))
        .orderBy(teams.createdAt); // Keep the oldest teams
      
      const result = {
        matchdayId: matchday.id,
        scheduledAt: matchday.scheduledAt,
        shouldHave: matchday.numberOfTeams,
        currentlyHas: matchdayTeams.length,
        action: 'none',
        teamsRemoved: [] as string[]
      };
      
      if (matchdayTeams.length > matchday.numberOfTeams) {
        const excessCount = matchdayTeams.length - matchday.numberOfTeams;
        const teamsToKeep = matchdayTeams.slice(0, matchday.numberOfTeams);
        const teamsToRemove = matchdayTeams.slice(matchday.numberOfTeams);
        
        result.action = 'removed_excess';
        result.teamsRemoved = teamsToRemove.map(t => `${t.name} (${t.colorToken})`);
        
        // Soft delete excess teams
        for (const team of teamsToRemove) {
          await db
            .update(teams)
            .set({ 
              deletedAt: new Date(),
              updatedAt: new Date(),
              updatedBy: user.id
            })
            .where(eq(teams.id, team.id));
        }
        
        console.log(`   ✅ Fixed! Removed ${excessCount} excess teams`);
      } else if (matchdayTeams.length === matchday.numberOfTeams) {
        result.action = 'already_correct';
      } else {
        result.action = 'needs_more_teams';
      }
      
      results.push(result);
    }
    
    return NextResponse.json({
      message: 'Team cleanup completed',
      results
    }, { status: 200 });
    
  } catch (error) {
    console.error('Failed to fix teams:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fix teams' },
      { status: 500 }
    );
  }
}
