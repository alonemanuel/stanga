#!/usr/bin/env tsx

/**
 * One-time script to fix penalty shootouts that should be marked as completed
 * but weren't due to the previous bug where ending a game with penalties
 * didn't mark the penalty shootout as completed.
 */

import { db } from '../src/lib/db';
import { games, penaltyShootouts } from '../src/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

async function fixPenaltyCompletion() {
  console.log('🔍 Looking for penalty shootouts that need to be marked as completed...');
  
  try {
    // Find all games that ended with 'penalties' but have penalty shootouts that are still 'active'
    const gamesWithIncompleteShootouts = await db
      .select({
        game: games,
        shootout: penaltyShootouts
      })
      .from(games)
      .innerJoin(penaltyShootouts, eq(penaltyShootouts.gameId, games.id))
      .where(
        and(
          eq(games.status, 'completed'),
          eq(games.endReason, 'penalties'),
          eq(penaltyShootouts.status, 'active'),
          isNull(games.deletedAt)
        )
      );

    if (gamesWithIncompleteShootouts.length === 0) {
      console.log('✅ No penalty shootouts need to be fixed. All are properly marked as completed.');
      return;
    }

    console.log(`🔧 Found ${gamesWithIncompleteShootouts.length} penalty shootout(s) that need to be marked as completed.`);

    // Update all the incomplete penalty shootouts
    let fixedCount = 0;
    for (const { game, shootout } of gamesWithIncompleteShootouts) {
      console.log(`   Fixing penalty shootout for game ${game.id} (${shootout.homeTeamScore}-${shootout.awayTeamScore})`);
      
      await db
        .update(penaltyShootouts)
        .set({ 
          status: 'completed',
          updatedBy: game.createdBy // Use the game creator as the updater
        })
        .where(eq(penaltyShootouts.id, shootout.id));
      
      fixedCount++;
    }

    console.log(`✅ Successfully marked ${fixedCount} penalty shootout(s) as completed.`);
    console.log('🎯 Penalty results should now show up properly in Recent Results!');

  } catch (error) {
    console.error('❌ Error fixing penalty completion:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  fixPenaltyCompletion()
    .then(() => {
      console.log('🏁 Script completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { fixPenaltyCompletion };
