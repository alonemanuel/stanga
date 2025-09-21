import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, teams } from '@/lib/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export interface QueueSuggestion {
  homeTeamId: string;
  awayTeamId: string;
  waitingTeamId: string;
  homeTeam: {
    id: string;
    name: string;
    colorToken: string;
    colorHex: string;
  };
  awayTeam: {
    id: string;
    name: string;
    colorToken: string;
    colorHex: string;
  };
  waitingTeam: {
    id: string;
    name: string;
    colorToken: string;
    colorHex: string;
  };
}

/**
 * Get the next game suggestion based on winner-stays queue logic
 * For three teams (A, B, C), winner-stays rotation:
 * - Initial: A vs B (C waiting)
 * - If A wins: A vs C (B waiting)
 * - If B wins: B vs C (A waiting)
 * - And so on...
 */
async function getNextGameSuggestion(matchdayId: string): Promise<QueueSuggestion | null> {
  // Get all active teams for this matchday
  const matchdayTeams = await db
    .select()
    .from(teams)
    .where(and(
      eq(teams.matchdayId, matchdayId),
      eq(teams.isActive, true),
      isNull(teams.deletedAt)
    ))
    .orderBy(teams.name);
  
  if (matchdayTeams.length < 3) {
    throw new Error('Need at least 3 teams for queue management');
  }
  
  // Get the last completed game
  const lastGame = await db
    .select()
    .from(games)
    .where(and(
      eq(games.matchdayId, matchdayId),
      eq(games.status, 'completed')
    ))
    .orderBy(desc(games.endedAt))
    .limit(1);
  
  let homeTeam, awayTeam, waitingTeam;
  
  if (!lastGame.length) {
    // First game - pick first two teams arbitrarily
    homeTeam = matchdayTeams[0];
    awayTeam = matchdayTeams[1];
    waitingTeam = matchdayTeams[2];
  } else {
    // Winner-stays logic
    const prevGame = lastGame[0];
    const winnerTeamId = prevGame.winnerTeamId;
    
    if (!winnerTeamId) {
      // If no winner (shouldn't happen), default to first two teams
      homeTeam = matchdayTeams[0];
      awayTeam = matchdayTeams[1];
      waitingTeam = matchdayTeams[2];
    } else {
      // Find the winner, loser, and waiting team from previous game
      const prevWinner = matchdayTeams.find(t => t.id === winnerTeamId);
      const prevLoser = matchdayTeams.find(t => 
        t.id !== winnerTeamId && 
        (t.id === prevGame.homeTeamId || t.id === prevGame.awayTeamId)
      );
      const prevWaiting = matchdayTeams.find(t => 
        t.id !== prevGame.homeTeamId && 
        t.id !== prevGame.awayTeamId
      );
      
      if (!prevWinner || !prevLoser || !prevWaiting) {
        // Fallback if we can't determine teams
        homeTeam = matchdayTeams[0];
        awayTeam = matchdayTeams[1];
        waitingTeam = matchdayTeams[2];
      } else {
        // Winner stays, plays against the waiting team
        homeTeam = prevWinner; // Winner becomes home team
        awayTeam = prevWaiting; // Waiting team becomes away team
        waitingTeam = prevLoser; // Loser waits
      }
    }
  }
  
  return {
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    waitingTeamId: waitingTeam.id,
    homeTeam,
    awayTeam,
    waitingTeam,
  };
}

// GET /api/matchdays/:id/queue-suggestion - Get queue suggestion
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: matchdayId } = await params;
    
    const suggestion = await getNextGameSuggestion(matchdayId);
    
    if (!suggestion) {
      return NextResponse.json(
        { error: 'Unable to generate queue suggestion' },
        { status: 400 }
      );
    }
    
    // Get current active game if any
    const activeGame = await db
      .select()
      .from(games)
      .where(and(
        eq(games.matchdayId, matchdayId),
        eq(games.status, 'active')
      ))
      .limit(1);
    
    const queueStatus = {
      suggestion,
      hasActiveGame: activeGame.length > 0,
      activeGame: activeGame[0] || null,
    };
    
    return NextResponse.json({ data: queueStatus });
    
  } catch (error) {
    console.error('Error getting queue suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to get queue suggestion' },
      { status: 500 }
    );
  }
}
