import { describe, it, expect, vi } from "vitest";

// Mock the auth module
vi.mock("@/lib/auth", () => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
}));

describe("Auth Guards", () => {
  it("requireAuth throws when no user", async () => {
    const { getUser } = await import("@/lib/auth");
    const { requireAuth } = await import("@/lib/auth-guards");
    
    vi.mocked(getUser).mockResolvedValue(null);
    
    await expect(requireAuth()).rejects.toThrow("UNAUTHORIZED");
  });

  it("requireAuth returns user when authenticated", async () => {
    const { getUser } = await import("@/lib/auth");
    const { requireAuth } = await import("@/lib/auth-guards");
    
    const mockUser = { 
      id: "123",
      email: "test@example.com", 
    };
    vi.mocked(getUser).mockResolvedValue(mockUser);
    
    const result = await requireAuth();
    expect(result).toEqual({ user: mockUser });
  });

  it("requireAuth error has status 401", async () => {
    const { getUser } = await import("@/lib/auth");
    const { requireAuth } = await import("@/lib/auth-guards");
    
    vi.mocked(getUser).mockResolvedValue(null);
    
    try {
      await requireAuth();
    } catch (error: any) {
      expect(error.status).toBe(401);
      expect(error.message).toBe("UNAUTHORIZED");
    }
  });
});
