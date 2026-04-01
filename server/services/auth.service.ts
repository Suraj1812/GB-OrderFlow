import bcrypt from "bcryptjs";
import { AuditAction } from "@prisma/client";

import type {
  AuthResponse,
  DealerLoginInput,
  ForgotPasswordInput,
  HeadOfficeLoginInput,
  ResetPasswordInput,
} from "../../shared/contracts.js";
import { env } from "../config/env.js";
import { AppError } from "../core/errors.js";
import {
  createAccessToken,
  createCsrfToken,
  createOtpCode,
  createPasswordResetTokenSecret,
  createRefreshToken,
  hashSecret,
} from "../core/tokens.js";
import { logger } from "../core/logger.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { mapSessionUser } from "./mappers.js";

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

function buildRefreshCookieValue(sessionId: string, rawToken: string) {
  return `${sessionId}.${rawToken}`;
}

function parseRefreshCookieValue(value?: string) {
  if (!value) {
    throw new AppError(401, "UNAUTHORIZED", "Refresh token is missing.");
  }

  const [sessionId, rawToken] = value.split(".");

  if (!sessionId || !rawToken) {
    throw new AppError(401, "UNAUTHORIZED", "Refresh token is invalid.");
  }

  return { sessionId, rawToken };
}

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  private async ensureAccountIsAvailable(
    userRecord: Awaited<ReturnType<AuthRepository["findUserById"]>>,
    meta: RequestMeta,
    identity: { dealerCode?: string; email?: string | null },
  ) {
    if (!userRecord || !userRecord.active) {
      throw new AppError(401, "UNAUTHORIZED", "Account is not active.");
    }

    if (userRecord.lockedUntil && userRecord.lockedUntil.getTime() > Date.now()) {
      await this.repository.createAuditLog({
        userId: userRecord.id,
        requestId: meta.requestId,
        action: AuditAction.LOGIN_FAILED,
        email: identity.email ?? userRecord.email,
        dealerCode: identity.dealerCode ?? userRecord.dealer?.code,
        message: "Login blocked because the account is temporarily locked.",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new AppError(
        423,
        "ACCOUNT_LOCKED",
        "Too many failed sign-in attempts. Please try again later.",
      );
    }
  }

  private async recordFailedLogin(
    userRecord: Awaited<ReturnType<AuthRepository["findUserById"]>>,
    meta: RequestMeta,
    details: {
      message: string;
      dealerCode?: string;
      email?: string | null;
    },
  ) {
    if (!userRecord) {
      return;
    }

    const nextFailures = (userRecord.failedLoginAttempts ?? 0) + 1;
    const shouldLock = nextFailures >= env.MAX_LOGIN_FAILURES;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + env.ACCOUNT_LOCK_MINUTES * 60 * 1000)
      : undefined;

    await this.repository.recordFailedLoginAttempt(userRecord.id, {
      lockedUntil,
    });
    await this.repository.createAuditLog({
      userId: userRecord.id,
      requestId: meta.requestId,
      action: AuditAction.LOGIN_FAILED,
      dealerCode: details.dealerCode ?? userRecord.dealer?.code,
      email: details.email ?? userRecord.email,
      message: shouldLock
        ? `${details.message} Account locked after repeated failures.`
        : details.message,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        failedLoginAttempts: nextFailures,
        lockedUntil: lockedUntil?.toISOString() ?? null,
      },
    });
  }

  private async issueSession(
    userRecord: Awaited<ReturnType<AuthRepository["findUserById"]>>,
    meta: RequestMeta,
  ) {
    if (!userRecord || !userRecord.active) {
      throw new AppError(401, "UNAUTHORIZED", "Account is not active.");
    }

    if (!env.ALLOW_MULTIPLE_ACTIVE_SESSIONS) {
      await this.repository.revokeAllUserSessions(userRecord.id);
    }

    const refreshToken = createRefreshToken();
    const session = await this.repository.createSession({
      userId: userRecord.id,
      refreshTokenHash: hashSecret(refreshToken),
      expiresAt: new Date(
        Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
      ),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await this.repository.updateLastLogin(userRecord.id);

    const user = mapSessionUser(userRecord);

    return {
      response: {
        user,
        csrfToken: createCsrfToken(),
      } satisfies AuthResponse,
      accessToken: createAccessToken({
        sub: user.id,
        role: user.role,
        displayName: user.displayName,
        email: user.email,
        dealerId: user.dealerId,
        dealerCode: user.dealerCode,
      }),
      refreshToken: buildRefreshCookieValue(session.id, refreshToken),
    };
  }

  public async loginDealer(input: DealerLoginInput, meta: RequestMeta) {
    const userRecord = await this.repository.findDealerUserByDealerCode(
      input.dealerCode,
    );

    if (!userRecord) {
      await this.repository.createAuditLog({
        requestId: meta.requestId,
        action: AuditAction.LOGIN_FAILED,
        dealerCode: input.dealerCode,
        message: "Dealer login failed: user not found.",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid dealer code or password.");
    }

    await this.ensureAccountIsAvailable(userRecord, meta, {
      dealerCode: input.dealerCode,
      email: userRecord.email,
    });

    const isValid = await bcrypt.compare(input.password, userRecord.passwordHash);

    if (!isValid) {
      await this.recordFailedLogin(userRecord, meta, {
        dealerCode: userRecord.dealer?.code ?? input.dealerCode,
        email: userRecord.email,
        message: "Dealer login failed: invalid password.",
      });
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid dealer code or password.");
    }

    const session = await this.issueSession(userRecord, meta);

    await this.repository.createAuditLog({
      userId: userRecord.id,
      requestId: meta.requestId,
      action: AuditAction.LOGIN_SUCCESS,
      dealerCode: userRecord.dealer?.code,
      email: userRecord.email,
      message: "Dealer login succeeded.",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return session;
  }

  public async loginHeadOffice(input: HeadOfficeLoginInput, meta: RequestMeta) {
    const userRecord = await this.repository.findHeadOfficeUserByUsername(
      input.username,
    );

    if (!userRecord) {
      await this.repository.createAuditLog({
        requestId: meta.requestId,
        action: AuditAction.LOGIN_FAILED,
        email: input.username,
        message: "Head Office login failed: user not found.",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
    }

    await this.ensureAccountIsAvailable(userRecord, meta, {
      email: userRecord.email ?? input.username,
    });

    const isValid = await bcrypt.compare(input.password, userRecord.passwordHash);

    if (!isValid) {
      await this.recordFailedLogin(userRecord, meta, {
        email: userRecord.email,
        message: "Head Office login failed: invalid password.",
      });
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
    }

    const session = await this.issueSession(userRecord, meta);

    await this.repository.createAuditLog({
      userId: userRecord.id,
      requestId: meta.requestId,
      action: AuditAction.LOGIN_SUCCESS,
      email: userRecord.email,
      message: "Head Office login succeeded.",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return session;
  }

  public async refreshSession(refreshCookie: string | undefined, meta: RequestMeta) {
    const { sessionId, rawToken } = parseRefreshCookieValue(refreshCookie);
    const sessionRecord = await this.repository.findSessionById(sessionId);

    if (
      !sessionRecord ||
      sessionRecord.revokedAt ||
      sessionRecord.expiresAt.getTime() <= Date.now() ||
      sessionRecord.refreshTokenHash !== hashSecret(rawToken) ||
      !sessionRecord.user.active
    ) {
      if (sessionRecord && !sessionRecord.revokedAt) {
        await this.repository.revokeSession(sessionId);
      }

      await this.repository.createAuditLog({
        userId: sessionRecord?.userId,
        requestId: meta.requestId,
        action: AuditAction.REFRESH_FAILED,
        email: sessionRecord?.user.email,
        dealerCode: sessionRecord?.user.dealer?.code,
        message: "Refresh token validation failed.",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new AppError(401, "UNAUTHORIZED", "Session refresh failed.");
    }

    const nextRefreshToken = createRefreshToken();
    await this.repository.rotateSession(sessionId, {
      refreshTokenHash: hashSecret(nextRefreshToken),
      expiresAt: new Date(
        Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
      ),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    const user = mapSessionUser(sessionRecord.user);

    await this.repository.createAuditLog({
      userId: sessionRecord.user.id,
      requestId: meta.requestId,
      action: AuditAction.REFRESH_SUCCESS,
      email: sessionRecord.user.email,
      dealerCode: sessionRecord.user.dealer?.code,
      message: "Session refreshed successfully.",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      response: {
        user,
        csrfToken: createCsrfToken(),
      } satisfies AuthResponse,
      accessToken: createAccessToken({
        sub: user.id,
        role: user.role,
        displayName: user.displayName,
        email: user.email,
        dealerId: user.dealerId,
        dealerCode: user.dealerCode,
      }),
      refreshToken: buildRefreshCookieValue(sessionId, nextRefreshToken),
    };
  }

  public async getSessionUser(userId: string): Promise<AuthResponse> {
    const userRecord = await this.repository.findUserById(userId);

    if (!userRecord || !userRecord.active) {
      throw new AppError(401, "UNAUTHORIZED", "Session is no longer active.");
    }

    return {
      user: mapSessionUser(userRecord),
      csrfToken: createCsrfToken(),
    };
  }

  public async logout(refreshCookie: string | undefined, meta: RequestMeta) {
    if (!refreshCookie) {
      return;
    }

    try {
      const { sessionId } = parseRefreshCookieValue(refreshCookie);
      const sessionRecord = await this.repository.findSessionById(sessionId);

      if (sessionRecord) {
        await this.repository.revokeSession(sessionId);
        await this.repository.createAuditLog({
          userId: sessionRecord.user.id,
          requestId: meta.requestId,
          action: AuditAction.LOGOUT,
          email: sessionRecord.user.email,
          dealerCode: sessionRecord.user.dealer?.code,
          message: "Session logged out.",
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });
      }
    } catch (error) {
      logger.warn(
        {
          err: error,
          requestId: meta.requestId,
        },
        "Logout skipped because refresh token was invalid.",
      );
    }
  }

  public async logoutAllSessions(userId: string, meta: RequestMeta) {
    const userRecord = await this.repository.findUserById(userId);

    if (!userRecord) {
      return;
    }

    await this.repository.revokeAllUserSessions(userId);
    await this.repository.createAuditLog({
      userId,
      requestId: meta.requestId,
      action: AuditAction.LOGOUT,
      email: userRecord.email,
      dealerCode: userRecord.dealer?.code,
      message: "All active sessions were logged out.",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        scope: "all_sessions",
      },
    });
  }

  public async requestPasswordReset(
    input: ForgotPasswordInput,
    meta: RequestMeta,
  ) {
    const userRecord = await this.repository.findUserForPasswordReset(
      input.identifier,
    );

    if (!userRecord) {
      await this.repository.createAuditLog({
        requestId: meta.requestId,
        action: AuditAction.PASSWORD_RESET_REQUEST,
        email: input.identifier,
        message: "Password reset requested for unknown user.",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });

      return {
        message:
          "If the account exists, a password reset OTP has been prepared for delivery.",
      };
    }

    const otp = createOtpCode();
    const resetToken = createPasswordResetTokenSecret();
    await this.repository.invalidatePasswordResetTokens(userRecord.id);
    await this.repository.createPasswordResetToken({
      userId: userRecord.id,
      otpHash: hashSecret(otp),
      resetTokenHash: hashSecret(resetToken),
      expiresAt: new Date(
        Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
      ),
    });

    await this.repository.createAuditLog({
      userId: userRecord.id,
      requestId: meta.requestId,
      action: AuditAction.PASSWORD_RESET_REQUEST,
      email: userRecord.email,
      dealerCode: userRecord.dealer?.code,
      message: "Password reset OTP generated.",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    logger.info(
      {
        userId: userRecord.id,
        identifier: input.identifier,
        otpPreview: otp,
        requestId: meta.requestId,
      },
      "Password reset OTP generated",
    );

    return {
      message:
        "If the account exists, a password reset OTP has been prepared for delivery.",
      ...(env.NODE_ENV !== "production"
        ? {
            otpPreview: otp,
            resetTokenPreview: resetToken,
          }
        : {}),
    };
  }

  public async resetPassword(input: ResetPasswordInput, meta: RequestMeta) {
    const userRecord = await this.repository.findUserForPasswordReset(
      input.identifier,
    );

    if (!userRecord) {
      await this.repository.createAuditLog({
        requestId: meta.requestId,
        action: AuditAction.PASSWORD_RESET_FAILED,
        email: input.identifier,
        message: "Password reset failed: user not found.",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new AppError(400, "INVALID_RESET_REQUEST", "Reset token is invalid.");
    }

    const token = await this.repository.findLatestActivePasswordResetToken(
      userRecord.id,
    );

    const matchesOtp = Boolean(input.otp) && token?.otpHash === hashSecret(input.otp ?? "");
    const matchesResetToken =
      Boolean(input.token) &&
      Boolean(token?.resetTokenHash) &&
      token?.resetTokenHash === hashSecret(input.token ?? "");

    if (!token || (!matchesOtp && !matchesResetToken)) {
      await this.repository.createAuditLog({
        userId: userRecord.id,
        requestId: meta.requestId,
        action: AuditAction.PASSWORD_RESET_FAILED,
        email: userRecord.email,
        dealerCode: userRecord.dealer?.code,
        message: "Password reset failed: invalid OTP or reset token.",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new AppError(400, "INVALID_RESET_REQUEST", "Reset token is invalid.");
    }

    const passwordHash = await bcrypt.hash(
      input.newPassword,
      env.BCRYPT_SALT_ROUNDS,
    );

    await this.repository.updateUserPasswordHash(userRecord.id, passwordHash);
    await this.repository.consumePasswordResetToken(token.id);
    await this.repository.revokeAllUserSessions(userRecord.id);

    await this.repository.createAuditLog({
      userId: userRecord.id,
      requestId: meta.requestId,
      action: AuditAction.PASSWORD_RESET_SUCCESS,
      email: userRecord.email,
      dealerCode: userRecord.dealer?.code,
      message: "Password reset completed successfully.",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      message: "Password updated successfully.",
    };
  }
}
