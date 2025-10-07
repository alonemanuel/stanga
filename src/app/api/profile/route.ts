import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-guards';
import { ProfileSettingsSchema } from '@/lib/validations/user';
import { createClient } from '@/lib/supabase/server';

const profileSelection = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  fullName: users.fullName,
  avatarUrl: users.avatarUrl,
  birthDate: users.birthDate,
  gender: users.gender,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export async function GET() {
  try {
    const { user } = await requireAuth();

    const [profile] = await db
      .select(profileSelection)
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.error('Failed to load profile:', error);
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: (error as { status?: number })?.status || 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAuth();
    const body = await request.json();
    const payload = ProfileSettingsSchema.parse(body);

    const now = new Date();

    const [updatedProfile] = await db
      .update(users)
      .set({
        displayName: payload.displayName,
        birthDate: payload.birthDate ?? null,
        gender: payload.gender ?? null,
        updatedAt: now,
        updatedBy: user.id,
      })
      .where(eq(users.id, user.id))
      .returning(profileSelection);

    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    try {
      const supabase = await createClient();
      if (supabase && 'auth' in supabase && typeof supabase.auth?.updateUser === 'function') {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            display_name: payload.displayName,
          },
        });

        if (metadataError) {
          console.error('Failed to update Supabase metadata:', metadataError);
        }
      }
    } catch (metadataError) {
      console.error('Failed to sync Supabase metadata:', metadataError);
    }

    return NextResponse.json({
      data: updatedProfile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error('Failed to update profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: (error as { status?: number })?.status || 500 }
    );
  }
}
