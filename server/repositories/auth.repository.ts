import {
  AuditAction,
  Prisma,
  UserRole,
  type PasswordResetToken,
} from "@prisma/client";

import type { DatabaseClient } from "../prisma/client.js";

export class AuthRepository {
  constructor(private readonly db: DatabaseClient) {}

  public findDealerUserByDealerCode(dealerCode: string) {
    return this.db.user.findFirst({
      where: {
        role: UserRole.DEALER,
        active: true,
        dealer: {
          code: {
            equals: dealerCode,
            mode: "insensitive",
          },
          active: true,
        },
      },
      include: {
        dealer: true,
      },
    });
  }

  public findHeadOfficeUserByUsername(username: string) {
    return this.db.user.findFirst({
      where: {
        role: UserRole.HEAD_OFFICE,
        active: true,
        username: {
          equals: username,
          mode: "insensitive",
        },
      },
      include: {
        dealer: true,
      },
    });
  }

  public findUserById(userId: string) {
    return this.db.user.findUnique({
      where: { id: userId },
      include: { dealer: true },
    });
  }

  public findUserForPasswordReset(identifier: string) {
    return this.db.user.findFirst({
      where: {
        active: true,
        OR: [
          {
            username: {
              equals: identifier,
              mode: "insensitive",
            },
          },
          {
            email: {
              equals: identifier,
              mode: "insensitive",
            },
          },
          {
            dealer: {
              code: {
                equals: identifier,
                mode: "insensitive",
              },
            },
          },
        ],
      },
      include: { dealer: true },
    });
  }

  public createSession(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.db.session.create({
      data: {
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  public findSessionById(sessionId: string) {
    return this.db.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          include: {
            dealer: true,
          },
        },
      },
    });
  }

  public rotateSession(
    sessionId: string,
    input: {
      refreshTokenHash: string;
      expiresAt: Date;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    return this.db.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
        revokedAt: null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  public revokeSession(sessionId: string) {
    return this.db.session.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  public revokeAllUserSessions(userId: string) {
    return this.db.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  public updateLastLogin(userId: string) {
    return this.db.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  public recordFailedLoginAttempt(userId: string, options?: { lockedUntil?: Date | null }) {
    return this.db.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: {
          increment: 1,
        },
        ...(options && "lockedUntil" in options ? { lockedUntil: options.lockedUntil } : {}),
      },
    });
  }

  public createPasswordResetToken(input: {
    userId: string;
    otpHash: string;
    resetTokenHash?: string;
    expiresAt: Date;
  }) {
    return this.db.passwordResetToken.create({
      data: input,
    });
  }

  public findLatestActivePasswordResetToken(userId: string): Promise<PasswordResetToken | null> {
    return this.db.passwordResetToken.findFirst({
      where: {
        userId,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  public consumePasswordResetToken(tokenId: string) {
    return this.db.passwordResetToken.update({
      where: { id: tokenId },
      data: {
        consumedAt: new Date(),
      },
    });
  }

  public invalidatePasswordResetTokens(userId: string) {
    return this.db.passwordResetToken.updateMany({
      where: {
        userId,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });
  }

  public updateUserPasswordHash(userId: string, passwordHash: string) {
    return this.db.user.update({
      where: { id: userId },
      data: {
        passwordHash,
      },
    });
  }

  public createAuditLog(input: {
    userId?: string;
    requestId?: string;
    action: AuditAction;
    email?: string | null;
    dealerCode?: string | null;
    message: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Prisma.JsonObject;
  }) {
    return this.db.auditLog.create({
      data: {
        userId: input.userId,
        requestId: input.requestId,
        action: input.action,
        email: input.email,
        dealerCode: input.dealerCode,
        message: input.message,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: input.metadata,
      },
    });
  }
}
