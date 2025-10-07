import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { UserProfileUpdateSchema } from '@/lib/validations/user';
import { requireAuth } from '@/lib/auth-guards';
import { logActivity, generateDiff } from '@/lib/activity-log';
import { eq } from 'drizzle-orm';

// GET /api/profile - Get current user profile
export async function GET() {
  try {
    const { user: authUser } = await requireAuth();
    
    // Get user profile from database
    const userProfile = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        gender: users.gender,
        dateOfBirth: users.dateOfBirth,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (userProfile.length === 0) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: userProfile[0],
    });
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

// PATCH /api/profile - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const { user: authUser } = await requireAuth();
    
    // Parse and validate request body
    const body = await request.json();
    const updateData = UserProfileUpdateSchema.parse(body);
    
    // Get current user data for diff logging
    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (currentUser.length === 0) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updatePayload: any = {
      updatedAt: new Date(),
      updatedBy: authUser.id,
    };

    // Only include fields that are being updated
    if (updateData.fullName !== undefined) {
      updatePayload.fullName = updateData.fullName;
    }
    if (updateData.gender !== undefined) {
      updatePayload.gender = updateData.gender;
    }
    if (updateData.dateOfBirth !== undefined) {
      // Convert date string to timestamp
      updatePayload.dateOfBirth = updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null;
    }

    // Update user profile
    const updatedUser = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, authUser.id))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        gender: users.gender,
        dateOfBirth: users.dateOfBirth,
        isActive: users.isActive,
        updatedAt: users.updatedAt,
      });

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    // Log activity
    await logActivity({
      entityType: 'user',
      entityId: authUser.id,
      action: 'update',
      actorId: authUser.id,
      changes: generateDiff(currentUser[0], updatedUser[0]),
      metadata: { fields: Object.keys(updateData) },
    });

    return NextResponse.json({
      data: updatedUser[0],
      message: 'Profile updated successfully',
    });
    
  } catch (error) {
    console.error('Failed to update user profile:', error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid profile data', details: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}