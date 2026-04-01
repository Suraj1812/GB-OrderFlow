import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

import { hashSecret } from "../core/tokens.js";
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
        failedLoginAttempts: 0,
        lockedUntil: null,
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

  it("locks the account after repeated failed login attempts", async () => {
    const passwordHash = await bcrypt.hash("dealer123456", 12);

    const repository = {
      findHeadOfficeUserByUsername: vi.fn().mockResolvedValue({
        id: "user-2",
        username: "admin",
        displayName: "Head Office",
        email: "admin@example.com",
        passwordHash,
        role: "HEAD_OFFICE",
        active: true,
        failedLoginAttempts: 4,
        lockedUntil: null,
        dealer: null,
      }),
      recordFailedLoginAttempt: vi.fn().mockResolvedValue(undefined),
      createAuditLog: vi.fn().mockResolvedValue(undefined),
    } as any;

    const service = new AuthService(repository);

    await expect(
      service.loginHeadOffice(
        {
          username: "admin",
          password: "wrong-password",
        },
        {
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
          requestId: "req-lockout",
        },
      ),
    ).rejects.toThrow("Invalid username or password.");

    expect(repository.recordFailedLoginAttempt).toHaveBeenCalledWith(
      "user-2",
      expect.objectContaining({
        lockedUntil: expect.any(Date),
      }),
    );
  });

  it("logs out all active sessions for the user", async () => {
    const repository = {
      findUserById: vi.fn().mockResolvedValue({
        id: "user-3",
        email: "dealer@example.com",
        dealer: {
          code: "GB-D001",
        },
      }),
      revokeAllUserSessions: vi.fn().mockResolvedValue({ count: 3 }),
      createAuditLog: vi.fn().mockResolvedValue(undefined),
    } as any;

    const service = new AuthService(repository);

    await service.logoutAllSessions("user-3", {
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      requestId: "req-logout-all",
    });

    expect(repository.revokeAllUserSessions).toHaveBeenCalledWith("user-3");
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-3",
        metadata: expect.objectContaining({
          scope: "all_sessions",
        }),
      }),
    );
  });

  it("accepts a secure reset token when resetting a password", async () => {
    const resetToken = "secure-reset-token-value-1234567890";

    const repository = {
      findUserForPasswordReset: vi.fn().mockResolvedValue({
        id: "user-4",
        email: "dealer@example.com",
        dealer: {
          code: "GB-D001",
        },
      }),
      findLatestActivePasswordResetToken: vi.fn().mockResolvedValue({
        id: "reset-1",
        otpHash: "unused",
        resetTokenHash: hashSecret(resetToken),
      }),
      updateUserPasswordHash: vi.fn().mockResolvedValue(undefined),
      consumePasswordResetToken: vi.fn().mockResolvedValue(undefined),
      revokeAllUserSessions: vi.fn().mockResolvedValue({ count: 1 }),
      createAuditLog: vi.fn().mockResolvedValue(undefined),
    } as any;

    const service = new AuthService(repository);

    const result = await service.resetPassword(
      {
        identifier: "GB-D001",
        token: resetToken,
        newPassword: "very-secure-password",
      },
      {
        requestId: "req-reset-token",
      },
    );

    expect(result.message).toBe("Password updated successfully.");
    expect(repository.updateUserPasswordHash).toHaveBeenCalled();
    expect(repository.consumePasswordResetToken).toHaveBeenCalledWith("reset-1");
  });
});
