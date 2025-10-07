import { db } from '../src/lib/db';
import { groups, groupMembers, players, matchdays, users } from '../src/lib/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Generate a random 6-character invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like O, 0, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function migrateToGroups() {
  console.log('Starting migration to multi-group system...');

  try {
    // 1. Create the default "FC Yarkon" group
    console.log('Creating FC Yarkon default group...');
    const fcYarkonGroup = await db.insert(groups).values({
      id: createId(),
      name: 'FC Yarkon',
      inviteCode: generateInviteCode(),
      description: 'Default group for existing Stanga users',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const groupId = fcYarkonGroup[0].id;
    console.log(`Created group: ${fcYarkonGroup[0].name} with ID: ${groupId} and invite code: ${fcYarkonGroup[0].inviteCode}`);

    // 2. Get all existing users
    console.log('Fetching existing users...');
    const allUsers = await db.select().from(users).where(eq(users.isActive, true));
    console.log(`Found ${allUsers.length} active users`);

    // 3. Add all existing users as admins of FC Yarkon group
    if (allUsers.length > 0) {
      console.log('Adding users as group admins...');
      const memberRecords = allUsers.map(user => ({
        id: createId(),
        groupId,
        userId: user.id,
        role: 'admin', // All existing users become admins of the default group
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.insert(groupMembers).values(memberRecords);
      console.log(`Added ${memberRecords.length} users as group admins`);
    }

    // 4. Update all existing players to belong to FC Yarkon group
    console.log('Migrating players to FC Yarkon group...');
    const playersToUpdate = await db.select().from(players).where(isNull(players.groupId));
    if (playersToUpdate.length > 0) {
      await db.update(players)
        .set({ groupId, updatedAt: new Date() })
        .where(isNull(players.groupId));
      console.log(`Updated ${playersToUpdate.length} players with group ID`);
    }

    // 5. Update all existing matchdays to belong to FC Yarkon group
    console.log('Migrating matchdays to FC Yarkon group...');
    const matchdaysToUpdate = await db.select().from(matchdays).where(isNull(matchdays.groupId));
    if (matchdaysToUpdate.length > 0) {
      await db.update(matchdays)
        .set({ groupId, updatedAt: new Date() })
        .where(isNull(matchdays.groupId));
      console.log(`Updated ${matchdaysToUpdate.length} matchdays with group ID`);
    }

    // 6. Make groupId NOT NULL constraints (done in a separate migration if needed)
    console.log('\nMigration completed successfully!');
    console.log(`FC Yarkon Group ID: ${groupId}`);
    console.log(`FC Yarkon Invite Code: ${fcYarkonGroup[0].inviteCode}`);
    console.log('\nAll existing data has been migrated to the FC Yarkon group.');
    console.log('All existing users are now admins of this group.');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateToGroups()
  .then(() => {
    console.log('\nMigration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  });
