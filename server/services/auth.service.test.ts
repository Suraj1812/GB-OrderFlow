import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

import { AuthService } from "./auth.service.js";

describe("AuthService", () => {
  it("issues dealer access and refresh tokens on successful login", async () => {
    const passwordHash = await bcrypt.hash("dealer123456", 12);

    const repository = {
      findDealerUserByDealerCode: vi.fn().mockResolvedValue({
        id: "user-1",
        username: "GB-D001",
        displayName: "Dealer User",
        email: "dealer@example.com",
        passwordHash,
        role: "DEALER",
        active: true,
        dealerId: "dealer-1",
        dealer: {
          id: "dealer-1",
          code: "GB-D001",
          name: "Dealer One",
        },
      }),
      createSession: vi.fn().mockResolvedValue({ id: "session-1" }),
      revokeAllUserSessions: vi.fn().mockResolvedValue({ count: 0 }),
      updateLastLogin: vi.fn().mockResolvedValue(undefined),
      createAuditLog: vi.fn().mockResolvedValue(undefined),
    } as any;

    const service = new AuthService(repository);

    const result = await service.loginDealer(
      {
        dealerCode: "GB-D001",
        password: "dealer123456",
      },
      {
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
      },
    );

    expect(result.response.user.role).toBe("dealer");
    expect(result.response.user.dealerCode).toBe("GB-D001");
    expect(result.accessToken.length).toBeGreaterThan(20);
    expect(result.refreshToken.startsWith("session-1.")).toBe(true);
    expect(repository.createAuditLog).toHaveBeenCalled();
  });
});
