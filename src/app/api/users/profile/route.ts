import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UserProfileUpdateSchema } from "@/lib/validations/user";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [profile] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        gender: users.gender,
        dateOfBirth: users.dateOfBirth,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = UserProfileUpdateSchema.parse(body);

    // Convert date string to Date object if provided
    const updateData: any = {
      fullName: validatedData.fullName,
      gender: validatedData.gender || null,
      dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
      updatedAt: new Date(),
      updatedBy: user.id,
    };

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    // Log the activity
    await logActivity({
      entityType: "user",
      entityId: user.id,
      action: "update",
      actorId: user.id,
      changes: {
        before: {},
        after: validatedData,
      },
      metadata: {
        source: "profile_page",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating profile:", error);
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid data", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
