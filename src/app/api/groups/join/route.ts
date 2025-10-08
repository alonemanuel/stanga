import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groups, groupMembers } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { ensureUser } from '@/lib/ensure-user';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// POST /api/groups/join - Join a group via invite code
export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();
    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== 'string' || inviteCode.trim().length !== 6) {
      return NextResponse.json(
        { error: 'Valid 6-character invite code is required' },
        { status: 400 }
      );
    }

    // Ensure user exists in users table
    await ensureUser({
      id: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name,
      avatarUrl: user.user_metadata?.avatar_url,
    });

    // Find the group by invite code
    const targetGroup = await db
      .select()
      .from(groups)
      .where(
        and(
          eq(groups.inviteCode, inviteCode.toUpperCase()),
          eq(groups.isActive, true)
        )
      )
      .limit(1);

    if (targetGroup.length === 0) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      );
    }

    const group = targetGroup[0];

    // Check if user is already a member
    const existingMembership = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, user.id)
        )
      )
      .limit(1);

    if (existingMembership.length > 0) {
      // User is already a member
      if (existingMembership[0].isActive) {
        return NextResponse.json(
          { error: 'You are already a member of this group' },
          { status: 400 }
        );
      } else {
        // Reactivate membership
        await db
          .update(groupMembers)
          .set({
            isActive: true,
            updatedAt: new Date(),
            updatedBy: user.id,
          })
          .where(eq(groupMembers.id, existingMembership[0].id));

        return NextResponse.json(group);
      }
    }

    // Add user as a member
    await db.insert(groupMembers).values({
      id: createId(),
      groupId: group.id,
      userId: user.id,
      role: 'member',
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(group);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to join group' },
      { status: error.status || 500 }
    );
  }
}
