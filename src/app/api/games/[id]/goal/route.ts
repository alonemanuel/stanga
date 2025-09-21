import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, gameEvents, players, teams, matchdays } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-log';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/games/:id/goal - Log a goal
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id: gameId } = await params;
    const body = await request.json();
    
    const { scorerId, assistId, teamId, minute } = body;
    
    if (!scorerId || !teamId) {
      return NextResponse.json(
        { error: 'Scorer ID and team ID are required' },
        { status: 400 }
      );
    }
    
    if (assistId && assistId === scorerId) {
      return NextResponse.json(
        { error: 'Assist player cannot be the same as scorer' },
        { status: 400 }
      );
    }
    
    // Get game details
    const game = await db
      .select()
      .from(games)
      .where(and(eq(games.id, gameId), isNull(games.deletedAt)))
      .limit(1);
    
    if (!game.length) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    const currentGame = game[0];
    
    if (currentGame.status !== 'active') {
      return NextResponse.json(
        { error: 'Game is not active' },
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
    
    // Validate scorer exists and is active
    const scorer = await db
      .select()
      .from(players)
      .where(and(eq(players.id, scorerId), isNull(players.deletedAt)))
      .limit(1);
    
    if (!scorer.length || !scorer[0].isActive) {
      return NextResponse.json(
        { error: 'Scorer not found or inactive' },
        { status: 404 }
      );
    }
    
    // Validate assist player if provided
    let assistPlayer = null;
    if (assistId) {
      const assist = await db
        .select()
        .from(players)
        .where(and(eq(players.id, assistId), isNull(players.deletedAt)))
        .limit(1);
      
      if (!assist.length || !assist[0].isActive) {
        return NextResponse.json(
          { error: 'Assist player not found or inactive' },
          { status: 404 }
        );
      }
      assistPlayer = assist[0];
    }
    
    // Calculate current minute if not provided
    const gameMinute = minute || (currentGame.startedAt 
      ? Math.floor((new Date().getTime() - new Date(currentGame.startedAt).getTime()) / 1000 / 60)
      : 0);
    
    // Create goal event
    const [goalEvent] = await db.insert(gameEvents).values({
      gameId,
      playerId: scorerId,
      teamId,
      eventType: 'goal',
      minute: gameMinute,
      description: `Goal by ${scorer[0].name}${assistPlayer ? ` (assist: ${assistPlayer.name})` : ''}`,
      metadata: assistId ? { assistId } : null,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    
    // Create assist event if provided
    let assistEvent = null;
    if (assistId && assistPlayer) {
      [assistEvent] = await db.insert(gameEvents).values({
        gameId,
        playerId: assistId,
        teamId,
        eventType: 'assist',
        minute: gameMinute,
        description: `Assist by ${assistPlayer.name} for ${scorer[0].name}`,
        metadata: { goalEventId: goalEvent.id },
        createdBy: user.id,
        updatedBy: user.id,
      }).returning();
    }
    
    // Update game score
    const isHomeTeam = teamId === currentGame.homeTeamId;
    const newHomeScore = isHomeTeam ? currentGame.homeScore + 1 : currentGame.homeScore;
    const newAwayScore = !isHomeTeam ? currentGame.awayScore + 1 : currentGame.awayScore;
    
    // Check for early finish condition
    const matchday = await db
      .select()
      .from(matchdays)
      .where(eq(matchdays.id, currentGame.matchdayId))
      .limit(1);
    
    const maxGoals = (matchday[0]?.rules as any)?.max_goals_to_win || currentGame.maxGoals || 5;
    const shouldEndEarly = Math.max(newHomeScore, newAwayScore) >= maxGoals;
    
    const gameUpdateData: any = {
      homeScore: newHomeScore,
      awayScore: newAwayScore,
      updatedBy: user.id,
    };
    
    if (shouldEndEarly) {
      gameUpdateData.status = 'completed';
      gameUpdateData.endedAt = new Date();
      gameUpdateData.endReason = 'early_finish';
      gameUpdateData.winnerTeamId = newHomeScore > newAwayScore ? currentGame.homeTeamId : currentGame.awayTeamId;
      gameUpdateData.duration = Math.floor((new Date().getTime() - new Date(currentGame.startedAt!).getTime()) / 1000 / 60);
    }
    
    const [updatedGame] = await db
      .update(games)
      .set(gameUpdateData)
      .where(eq(games.id, gameId))
      .returning();
    
    // Log the activity
    await logActivity({
      entityType: 'game',
      entityId: gameId,
      action: 'update',
      actorId: user.id,
      changes: {
        goal_scored: {
          scorer: scorer[0].name,
          assist: assistPlayer?.name || null,
          team: teamId,
          minute: gameMinute,
          newScore: `${newHomeScore}-${newAwayScore}`,
          earlyFinish: shouldEndEarly
        }
      }
    });
    
    const response = {
      goalEvent,
      assistEvent,
      updatedGame,
      earlyFinish: shouldEndEarly
    };
    
    return NextResponse.json({ data: response }, { status: 201 });
    
  } catch (error) {
    console.error('Error logging goal:', error);
    return NextResponse.json(
      { error: 'Failed to log goal' },
      { status: 500 }
    );
  }
}

// DELETE /api/games/:id/goal - Undo last goal (soft delete last active goal event)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id: gameId } = await params;
    
    // Get game details
    const game = await db
      .select()
      .from(games)
      .where(and(eq(games.id, gameId), isNull(games.deletedAt)))
      .limit(1);
    
    if (!game.length) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    const currentGame = game[0];
    
    if (currentGame.status !== 'active') {
      return NextResponse.json(
        { error: 'Can only undo goals in active games' },
        { status: 400 }
      );
    }
    
    // Find the last active goal event
    const lastGoalEvent = await db
      .select()
      .from(gameEvents)
      .where(and(
        eq(gameEvents.gameId, gameId),
        eq(gameEvents.eventType, 'goal'),
        eq(gameEvents.isActive, true)
      ))
      .orderBy(desc(gameEvents.createdAt))
      .limit(1);
    
    if (!lastGoalEvent.length) {
      return NextResponse.json(
        { error: 'No goals to undo' },
        { status: 400 }
      );
    }
    
    const goalToUndo = lastGoalEvent[0];
    
    // Soft delete the goal event and any associated assist
    await db
      .update(gameEvents)
      .set({ 
        isActive: false,
        updatedBy: user.id 
      })
      .where(eq(gameEvents.id, goalToUndo.id));
    
    // Also soft delete associated assist event if it exists
    if (goalToUndo.metadata && (goalToUndo.metadata as any).assistId) {
      await db
        .update(gameEvents)
        .set({ 
          isActive: false,
          updatedBy: user.id 
        })
        .where(and(
          eq(gameEvents.gameId, gameId),
          eq(gameEvents.eventType, 'assist'),
          eq(gameEvents.playerId, (goalToUndo.metadata as any).assistId),
          eq(gameEvents.minute, goalToUndo.minute || 0)
        ));
    }
    
    // Update game score
    const isHomeTeam = goalToUndo.teamId === currentGame.homeTeamId;
    const newHomeScore = isHomeTeam ? Math.max(0, currentGame.homeScore - 1) : currentGame.homeScore;
    const newAwayScore = !isHomeTeam ? Math.max(0, currentGame.awayScore - 1) : currentGame.awayScore;
    
    const [updatedGame] = await db
      .update(games)
      .set({
        homeScore: newHomeScore,
        awayScore: newAwayScore,
        updatedBy: user.id,
      })
      .where(eq(games.id, gameId))
      .returning();
    
    // Log the activity
    await logActivity({
      entityType: 'game',
      entityId: gameId,
      action: 'update',
      actorId: user.id,
      changes: {
        goal_undone: {
          undoneGoalId: goalToUndo.id,
          newScore: `${newHomeScore}-${newAwayScore}`
        }
      }
    });
    
    return NextResponse.json({ 
      data: { 
        updatedGame,
        undoneEvent: goalToUndo
      } 
    });
    
  } catch (error) {
    console.error('Error undoing goal:', error);
    return NextResponse.json(
      { error: 'Failed to undo goal' },
      { status: 500 }
    );
  }
}
