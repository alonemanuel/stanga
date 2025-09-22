import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, gameEvents, players } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { eq, and, isNull } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-log';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/goals/:id - Edit a goal
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id: goalId } = await params;
    const body = await request.json();
    
    const { playerId, assistId } = body;
    
    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }
    
    if (assistId && assistId === playerId) {
      return NextResponse.json(
        { error: 'Assist player cannot be the same as scorer' },
        { status: 400 }
      );
    }
    
    // Get the goal event
    const goalEvent = await db
      .select()
      .from(gameEvents)
      .where(and(
        eq(gameEvents.id, goalId),
        eq(gameEvents.eventType, 'goal'),
        eq(gameEvents.isActive, true)
      ))
      .limit(1);
    
    if (!goalEvent.length) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }
    
    const currentGoal = goalEvent[0];
    
    // Get the game to ensure it's still active
    const game = await db
      .select()
      .from(games)
      .where(eq(games.id, currentGoal.gameId))
      .limit(1);
    
    if (!game.length) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    // Allow editing goals even if game is completed
    // This gives flexibility to correct mistakes
    
    // Validate new scorer exists and is active
    const scorer = await db
      .select()
      .from(players)
      .where(and(eq(players.id, playerId), isNull(players.deletedAt)))
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
    
    // Update the goal event
    const updatedDescription = `Goal by ${scorer[0].name}${assistPlayer ? ` (assist: ${assistPlayer.name})` : ''}`;
    
    const [updatedGoal] = await db
      .update(gameEvents)
      .set({
        playerId,
        description: updatedDescription,
        metadata: assistId ? { assistId } as any : null,
        updatedBy: user.id,
      })
      .where(eq(gameEvents.id, goalId))
      .returning();
    
    // Handle assist event - first delete any existing assist for this goal
    await db
      .update(gameEvents)
      .set({
        isActive: false,
        updatedBy: user.id,
      })
      .where(and(
        eq(gameEvents.gameId, currentGoal.gameId),
        eq(gameEvents.eventType, 'assist'),
        eq(gameEvents.isActive, true)
      ));
    
    // Create new assist event if provided
    let assistEvent = null;
    if (assistId && assistPlayer) {
      [assistEvent] = await db.insert(gameEvents).values({
        gameId: currentGoal.gameId,
        playerId: assistId,
        teamId: currentGoal.teamId,
        eventType: 'assist',
        minute: currentGoal.minute,
        description: `Assist by ${assistPlayer.name} for ${scorer[0].name}`,
        metadata: { goalEventId: goalId } as any,
        createdBy: user.id,
        updatedBy: user.id,
      }).returning();
    }
    
    // Log the activity
    await logActivity({
      entityType: 'game',
      entityId: currentGoal.gameId,
      action: 'update',
      actorId: user.id,
      changes: {
        goal_edited: {
          goalId,
          oldScorer: currentGoal.playerId,
          newScorer: scorer[0].name,
          newAssist: assistPlayer?.name || null,
          minute: currentGoal.minute
        }
      }
    });
    
    const response = {
      id: goalId,
      playerId,
      playerName: scorer[0].name,
      minute: currentGoal.minute || 0,
      assistId: assistId || undefined,
      assistName: assistPlayer?.name || undefined,
      teamId: currentGoal.teamId,
      gameId: currentGoal.gameId
    };
    
    return NextResponse.json({ data: response });
    
  } catch (error) {
    console.error('Error editing goal:', error);
    return NextResponse.json(
      { error: 'Failed to edit goal' },
      { status: 500 }
    );
  }
}

// DELETE /api/goals/:id - Delete a goal
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id: goalId } = await params;
    
    // Get the goal event
    const goalEvent = await db
      .select()
      .from(gameEvents)
      .where(and(
        eq(gameEvents.id, goalId),
        eq(gameEvents.eventType, 'goal'),
        eq(gameEvents.isActive, true)
      ))
      .limit(1);
    
    if (!goalEvent.length) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }
    
    const currentGoal = goalEvent[0];
    
    // Get the game
    const game = await db
      .select()
      .from(games)
      .where(eq(games.id, currentGoal.gameId))
      .limit(1);
    
    if (!game.length) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    const currentGame = game[0];
    
    // Soft delete the goal event
    await db
      .update(gameEvents)
      .set({
        isActive: false,
        updatedBy: user.id,
      })
      .where(eq(gameEvents.id, goalId));
    
    // Also soft delete any associated assist event
    await db
      .update(gameEvents)
      .set({
        isActive: false,
        updatedBy: user.id,
      })
      .where(and(
        eq(gameEvents.gameId, currentGoal.gameId),
        eq(gameEvents.eventType, 'assist'),
        eq(gameEvents.isActive, true)
      ));
    
    // Recalculate scores after deletion
    const remainingGoalEvents = await db
      .select()
      .from(gameEvents)
      .where(and(
        eq(gameEvents.gameId, currentGoal.gameId),
        eq(gameEvents.eventType, 'goal'),
        eq(gameEvents.isActive, true)
      ));
    
    const homeGoals = remainingGoalEvents.filter(e => e.teamId === currentGame.homeTeamId).length;
    const awayGoals = remainingGoalEvents.filter(e => e.teamId === currentGame.awayTeamId).length;
    
    // Update game scores
    const gameUpdateData: any = {
      homeScore: homeGoals,
      awayScore: awayGoals,
      updatedBy: user.id,
    };
    
    // If game was ended by early finish but now doesn't meet criteria, revert to active
    if (currentGame.endReason === 'early_finish') {
      const maxGoals = currentGame.maxGoals || 5;
      const shouldStillBeEnded = Math.max(homeGoals, awayGoals) >= maxGoals;
      
      if (!shouldStillBeEnded) {
        gameUpdateData.status = 'active';
        gameUpdateData.endedAt = null;
        gameUpdateData.endReason = null;
        gameUpdateData.winnerTeamId = null;
        gameUpdateData.duration = null;
      } else {
        // Update winner if scores changed
        gameUpdateData.winnerTeamId = homeGoals > awayGoals ? currentGame.homeTeamId : currentGame.awayTeamId;
      }
    }
    
    const [updatedGame] = await db
      .update(games)
      .set(gameUpdateData)
      .where(eq(games.id, currentGoal.gameId))
      .returning();
    
    // Log the activity
    await logActivity({
      entityType: 'game',
      entityId: currentGoal.gameId,
      action: 'update',
      actorId: user.id,
      changes: {
        goal_deleted: {
          goalId,
          minute: currentGoal.minute,
          newScore: `${homeGoals}-${awayGoals}`,
          gameReactivated: currentGame.endReason === 'early_finish' && updatedGame.status === 'active'
        }
      }
    });
    
    return NextResponse.json({ 
      data: { 
        message: 'Goal deleted successfully',
        updatedGame,
        newScore: { home: homeGoals, away: awayGoals }
      } 
    });
    
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
}
