import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groups } from '@/lib/db/schema';
import { requireAuth, requireGroupAdmin } from '@/lib/auth-guards';
import { eq } from 'drizzle-orm';

// Generate a random 6-character invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/groups/[id]/regenerate-code - Regenerate invite code (admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;

    await requireGroupAdmin(user.id, id);

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

    // Update the group with new invite code
    const updatedGroup = await db
      .update(groups)
      .set({
        inviteCode,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(groups.id, id))
      .returning();

    if (updatedGroup.length === 0) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ inviteCode });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate invite code' },
      { status: error.status || 500 }
    );
  }
}
