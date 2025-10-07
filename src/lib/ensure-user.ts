import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

interface UserData {
  id: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}

/**
 * Ensures a user exists in the users table. Creates if missing, updates if exists.
 * This should be called whenever a user performs an action that requires a users table record.
 */
export async function ensureUser(userData: UserData): Promise<void> {
  try {
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userData.id))
      .limit(1);

    if (existingUser.length === 0) {
      // Create user
      await db.insert(users).values({
        id: userData.id,
        email: userData.email,
        fullName: userData.fullName || null,
        avatarUrl: userData.avatarUrl || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userData.id,
        updatedBy: userData.id,
      });
    } else {
      // Update user if data has changed
      const user = existingUser[0];
      if (
        user.email !== userData.email ||
        user.fullName !== userData.fullName ||
        user.avatarUrl !== userData.avatarUrl
      ) {
        await db
          .update(users)
          .set({
            email: userData.email,
            fullName: userData.fullName || null,
            avatarUrl: userData.avatarUrl || null,
            updatedAt: new Date(),
            updatedBy: userData.id,
          })
          .where(eq(users.id, userData.id));
      }
    }
  } catch (error) {
    console.error('Failed to ensure user exists:', error);
    // Don't throw - we don't want this to break the main flow
  }
}
