import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groups, groupMembers } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Generate a random 6-character invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/groups - Get all groups for current user
export async function GET() {
  try {
    const { user } = await requireAuth();

    // Get all groups where user is a member
    const userGroups = await db
      .select({
        group: groups,
        membership: groupMembers,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(
        and(
          eq(groupMembers.userId, user.id),
          eq(groupMembers.isActive, true),
          eq(groups.isActive, true)
        )
      );

    return NextResponse.json({
      groups: userGroups.map(ug => ({
        ...ug.group,
        role: ug.membership.role,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch groups' },
      { status: error.status || 500 }
    );
  }
}

// POST /api/groups - Create a new group
export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let codeExists = true;
    let attempts = 0;

    while (codeExists && attempts < 10) {
      const existing = await db
        .select()
        .from(groups)
        .where(eq(groups.inviteCode, inviteCode))
        .limit(1);
      
      if (existing.length === 0) {
        codeExists = false;
      } else {
        inviteCode = generateInviteCode();
        attempts++;
      }
    }

    if (codeExists) {
      return NextResponse.json(
        { error: 'Failed to generate unique invite code' },
        { status: 500 }
      );
    }

    // Create the group
    const newGroup = await db
      .insert(groups)
      .values({
        id: createId(),
        name: name.trim(),
        description: description?.trim() || null,
        inviteCode,
        isActive: true,
        createdBy: user.id,
        updatedBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Add creator as admin
    await db.insert(groupMembers).values({
      id: createId(),
      groupId: newGroup[0].id,
      userId: user.id,
      role: 'admin',
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(newGroup[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create group' },
      { status: error.status || 500 }
    );
  }
}
