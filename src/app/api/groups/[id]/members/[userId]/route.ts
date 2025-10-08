import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMembers } from '@/lib/db/schema';
import { requireAuth, requireGroupAdmin } from '@/lib/auth-guards';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

// PATCH /api/groups/[id]/members/[userId] - Update member role (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id, userId } = await params;

    await requireGroupAdmin(user.id, id);

    const body = await request.json();
    const { role } = body;

    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "member"' },
        { status: 400 }
      );
    }

    // Prevent user from demoting themselves if they're the only admin
    if (userId === user.id && role === 'member') {
      const adminCount = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, id),
            eq(groupMembers.role, 'admin'),
            eq(groupMembers.isActive, true)
          )
        );

      if (adminCount.length <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last admin of the group' },
          { status: 400 }
        );
      }
    }

    const updatedMember = await db
      .update(groupMembers)
      .set({
        role,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, userId),
          eq(groupMembers.isActive, true)
        )
      )
      .returning();

    if (updatedMember.length === 0) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update member role' },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/groups/[id]/members/[userId] - Remove member from group (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id, userId } = await params;

    await requireGroupAdmin(user.id, id);

    // Prevent removing the last admin
    if (userId !== user.id) {
      const memberToRemove = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, id),
            eq(groupMembers.userId, userId),
            eq(groupMembers.isActive, true)
          )
        )
        .limit(1);

      if (memberToRemove.length > 0 && memberToRemove[0].role === 'admin') {
        const adminCount = await db
          .select()
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.groupId, id),
              eq(groupMembers.role, 'admin'),
              eq(groupMembers.isActive, true)
            )
          );

        if (adminCount.length <= 1) {
          return NextResponse.json(
            { error: 'Cannot remove the last admin of the group' },
            { status: 400 }
          );
        }
      }
    }

    // Soft delete the membership
    const removed = await db
      .update(groupMembers)
      .set({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, userId),
          eq(groupMembers.isActive, true)
        )
      )
      .returning();

    if (removed.length === 0) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to remove member' },
      { status: error.status || 500 }
    );
  }
}
