import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, penaltyShootouts, penaltyKicks, players } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { eq, and, isNull, desc, count } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-log';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/games/:id/penalties/kick - Log a penalty kick
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id: gameId } = await params;
    const body = await request.json();
    
    const { playerId, teamId, result, description } = body;
    
    if (!playerId || !teamId || !result) {
      return NextResponse.json(
        { error: 'Player ID, team ID, and result are required' },
        { status: 400 }
      );
    }
    
    if (!['goal', 'miss', 'save'].includes(result)) {
      return NextResponse.json(
        { error: 'Result must be "goal", "miss", or "save"' },
        { status: 400 }
      );
    }
    
    // Get game and shootout details
    const [game, shootout] = await Promise.all([
      db.select().from(games).where(and(eq(games.id, gameId), isNull(games.deletedAt))).limit(1),
      db.select().from(penaltyShootouts).where(eq(penaltyShootouts.gameId, gameId)).limit(1)
    ]);
    
    if (!game.length) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    if (!shootout.length) {
      return NextResponse.json(
        { error: 'No active penalty shootout found' },
        { status: 404 }
      );
    }
    
    const currentGame = game[0];
    const currentShootout = shootout[0];
    
    if (currentShootout.status !== 'active') {
      return NextResponse.json(
        { error: 'Penalty shootout is not active' },
        { status: 400 }
      );
    }
    
    // Validate team belongs to this game
    if (teamId !== currentGame.homeTeamId && teamId !== currentGame.awayTeamId) {
      return NextResponse.json(
        { error: 'Team is not playing in this game' },
        { status: 400 }
      );
    }
    
    // Validate player exists and is active
    const player = await db
      .select()
      .from(players)
      .where(and(eq(players.id, playerId), isNull(players.deletedAt)))
      .limit(1);
    
    if (!player.length || !player[0].isActive) {
      return NextResponse.json(
        { error: 'Player not found or inactive' },
        { status: 404 }
      );
    }
    
    // Get current kick order (total kicks + 1)
    const kickCountResult = await db
      .select({ count: count() })
      .from(penaltyKicks)
      .where(eq(penaltyKicks.shootoutId, currentShootout.id));
    
    const kickOrder = (kickCountResult[0]?.count || 0) + 1;
    
    // Create penalty kick record
    const [kick] = await db.insert(penaltyKicks).values({
      shootoutId: currentShootout.id,
      playerId,
      teamId,
      kickOrder,
      result,
      description: description || `${result} by ${player[0].name}`,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    
    // Update shootout scores if goal
    let updatedShootout = currentShootout;
    if (result === 'goal') {
      const isHomeTeam = teamId === currentGame.homeTeamId;
      const newHomeScore = isHomeTeam ? currentShootout.homeTeamScore + 1 : currentShootout.homeTeamScore;
      const newAwayScore = !isHomeTeam ? currentShootout.awayTeamScore + 1 : currentShootout.awayTeamScore;
      
      [updatedShootout] = await db
        .update(penaltyShootouts)
        .set({
          homeTeamScore: newHomeScore,
          awayTeamScore: newAwayScore,
          updatedBy: user.id,
        })
        .where(eq(penaltyShootouts.id, currentShootout.id))
        .returning();
    }
    
    // Check if shootout should end
    const shouldEndShootout = await checkShootoutEnd(currentShootout.id, updatedShootout);
    
    if (shouldEndShootout.shouldEnd) {
      // End the shootout
      const [finalShootout] = await db
        .update(penaltyShootouts)
        .set({
          status: 'completed',
          winnerTeamId: shouldEndShootout.winnerTeamId,
          updatedBy: user.id,
        })
        .where(eq(penaltyShootouts.id, currentShootout.id))
        .returning();
      
      // End the game
      await db
        .update(games)
        .set({
          status: 'completed',
          endedAt: new Date(),
          endReason: 'penalties',
          winnerTeamId: shouldEndShootout.winnerTeamId,
          duration: currentGame.startedAt 
            ? Math.floor((new Date().getTime() - new Date(currentGame.startedAt).getTime()) / 1000 / 60)
            : null,
          updatedBy: user.id,
        })
        .where(eq(games.id, gameId));
      
      updatedShootout = finalShootout;
    }
    
    // Log the activity
    await logActivity({
      entityType: 'game',
      entityId: gameId,
      action: 'update',
      actorId: user.id,
      changes: {
        penalty_kick: {
          player: player[0].name,
          team: teamId,
          result,
          kickOrder,
          shootoutEnded: shouldEndShootout.shouldEnd,
          winner: shouldEndShootout.winnerTeamId
        }
      }
    });
    
    const response = {
      kick: {
        ...kick,
        player: player[0]
      },
      shootout: updatedShootout,
      gameEnded: shouldEndShootout.shouldEnd
    };
    
    return NextResponse.json({ data: response }, { status: 201 });
    
  } catch (error) {
    console.error('Error logging penalty kick:', error);
    return NextResponse.json(
      { error: 'Failed to log penalty kick' },
      { status: 500 }
    );
  }
}

// Helper function to determine if shootout should end
async function checkShootoutEnd(shootoutId: string, shootout: any) {
  // Get all kicks for this shootout
  const kicks = await db
    .select()
    .from(penaltyKicks)
    .where(eq(penaltyKicks.shootoutId, shootoutId))
    .orderBy(penaltyKicks.kickOrder);
  
  const homeKicks = kicks.filter(k => k.teamId === shootout.homeTeamId);
  const awayKicks = kicks.filter(k => k.teamId === shootout.awayTeamId);
  
  const homeGoals = shootout.homeTeamScore;
  const awayGoals = shootout.awayTeamScore;
  
  // Standard penalty shootout rules:
  // - Minimum 5 kicks per team
  // - If after equal kicks, one team has more goals and the other can't catch up
  // - Sudden death after 5 kicks each if still tied
  
  const minKicks = Math.min(homeKicks.length, awayKicks.length);
  const maxKicks = Math.max(homeKicks.length, awayKicks.length);
  
  // If we haven't reached 5 kicks each, check if one team already can't catch up
  if (minKicks < 5) {
    const homeRemaining = 5 - homeKicks.length;
    const awayRemaining = 5 - awayKicks.length;
    
    // Check if home team can't catch up
    if (awayGoals > homeGoals + homeRemaining) {
      return { shouldEnd: true, winnerTeamId: shootout.awayTeamId };
    }
    
    // Check if away team can't catch up
    if (homeGoals > awayGoals + awayRemaining) {
      return { shouldEnd: true, winnerTeamId: shootout.homeTeamId };
    }
  }
  
  // After 5 kicks each, sudden death
  if (minKicks >= 5 && homeKicks.length === awayKicks.length) {
    if (homeGoals !== awayGoals) {
      return { 
        shouldEnd: true, 
        winnerTeamId: homeGoals > awayGoals ? shootout.homeTeamId : shootout.awayTeamId 
      };
    }
  }
  
  return { shouldEnd: false, winnerTeamId: null };
}
