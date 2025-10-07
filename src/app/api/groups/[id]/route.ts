import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groups } from '@/lib/db/schema';
import { requireAuth, requireGroupAdmin } from '@/lib/auth-guards';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/groups/[id] - Get group details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;

    const group = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (group.length === 0) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(group[0]);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch group' },
      { status: error.status || 500 }
    );
  }
}

// PATCH /api/groups/[id] - Update group (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;

    await requireGroupAdmin(user.id, id);

    const body = await request.json();
    const { name, description, avatarUrl } = body;

    const updates: any = {
      updatedAt: new Date(),
      updatedBy: user.id,
    };

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Invalid group name' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl?.trim() || null;
    }

    const updatedGroup = await db
      .update(groups)
      .set(updates)
      .where(eq(groups.id, id))
      .returning();

    if (updatedGroup.length === 0) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedGroup[0]);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update group' },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/groups/[id] - Soft delete group (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;

    await requireGroupAdmin(user.id, id);

    const deletedGroup = await db
      .update(groups)
      .set({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(groups.id, id))
      .returning();

    if (deletedGroup.length === 0) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete group' },
      { status: error.status || 500 }
    );
  }
}
