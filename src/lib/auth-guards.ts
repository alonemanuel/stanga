import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { groupMembers } from "@/lib/db/schema";
import { ensureUser } from "@/lib/ensure-user";
import { and, eq } from "drizzle-orm";

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    const err: any = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
  
  // Ensure user exists in users table
  await ensureUser({
    id: user.id,
    email: user.email || '',
    fullName: user.user_metadata?.full_name,
    avatarUrl: user.user_metadata?.avatar_url,
  });
  
  return { user };
}

export async function isGroupMember(userId: string, groupId: string): Promise<boolean> {
  const member = await db.select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.userId, userId),
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.isActive, true)
      )
    )
    .limit(1);
  
  return member.length > 0;
}

export async function isGroupAdmin(userId: string, groupId: string): Promise<boolean> {
  const member = await db.select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.userId, userId),
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.role, 'admin'),
        eq(groupMembers.isActive, true)
      )
    )
    .limit(1);
  
  return member.length > 0;
}

export async function requireGroupMember(userId: string, groupId: string) {
  const isMember = await isGroupMember(userId, groupId);
  if (!isMember) {
    const err: any = new Error("FORBIDDEN: Not a member of this group");
    err.status = 403;
    throw err;
  }
}

export async function requireGroupAdmin(userId: string, groupId: string) {
  const isAdmin = await isGroupAdmin(userId, groupId);
  if (!isAdmin) {
    const err: any = new Error("FORBIDDEN: Admin access required");
    err.status = 403;
    throw err;
  }
}

export async function canManageMatchdays(userId: string, groupId: string): Promise<boolean> {
  return isGroupAdmin(userId, groupId);
}
