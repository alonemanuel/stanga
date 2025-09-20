import { getUser } from "@/lib/auth";

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    const err: any = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
  return { user };
}
