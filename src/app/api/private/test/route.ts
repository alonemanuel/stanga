import { requireAuth } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { user } = await requireAuth();
    return NextResponse.json({ 
      message: "Authorized", 
      user: user.email 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" }, 
      { status: 401 }
    );
  }
}

export async function POST() {
  try {
    const { user } = await requireAuth();
    return NextResponse.json({ 
      message: "Write operation authorized", 
      user: user.email 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" }, 
      { status: 401 }
    );
  }
}
