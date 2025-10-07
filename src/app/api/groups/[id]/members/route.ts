import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMembers, users } from '@/lib/db/schema';
import { requireAuth, requireGroupMember } from '@/lib/auth-guards';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/groups/[id]/members - Get all members of a group
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;

    await requireGroupMember(user.id, id);

    const members = await db
      .select({
        member: groupMembers,
        user: users,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.isActive, true)
        )
      );

    return NextResponse.json({
      members: members.map(m => ({
        id: m.member.id,
        userId: m.member.userId,
        role: m.member.role,
        email: m.user.email,
        fullName: m.user.fullName,
        avatarUrl: m.user.avatarUrl,
        createdAt: m.member.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch members' },
      { status: error.status || 500 }
    );
  }
}
