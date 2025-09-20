import { describe, it, expect, vi } from "vitest";

// Mock Supabase auth
vi.mock("@/lib/auth", () => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
}));

describe("Supabase Auth", () => {
  it("should export auth functions", async () => {
    const { getUser, signOut } = await import("@/lib/auth");
    expect(getUser).toBeDefined();
    expect(signOut).toBeDefined();
  });

  it("requireAuth should throw when no user", async () => {
    const { getUser } = await import("@/lib/auth");
    const { requireAuth } = await import("@/lib/auth-guards");
    
    vi.mocked(getUser).mockResolvedValue(null);
    
    await expect(requireAuth()).rejects.toThrow("UNAUTHORIZED");
  });

  it("requireAuth should return user when authenticated", async () => {
    const { getUser } = await import("@/lib/auth");
    const { requireAuth } = await import("@/lib/auth-guards");
    
    const mockUser = { id: "123", email: "test@example.com" };
    vi.mocked(getUser).mockResolvedValue(mockUser);
    
    const result = await requireAuth();
    expect(result).toEqual({ user: mockUser });
  });
});
