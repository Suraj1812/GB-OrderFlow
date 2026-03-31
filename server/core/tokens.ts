import crypto from "node:crypto";

import jwt from "jsonwebtoken";
import { z } from "zod";

import { env } from "../config/env.js";
import { AppError } from "./errors.js";

const accessTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(["dealer", "head_office"]),
  displayName: z.string().min(1),
  email: z.string().nullable(),
  dealerId: z.string().nullable().optional(),
  dealerCode: z.string().nullable().optional(),
});

type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

const downloadTokenPayloadSchema = z.object({
  exportId: z.string().min(1),
});

export function createAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
  });
}

export function verifyAccessToken(token: string) {
  try {
    return accessTokenPayloadSchema.parse(jwt.verify(token, env.ACCESS_TOKEN_SECRET));
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Your session has expired.");
  }
}

export function createDownloadToken(payload: { exportId: string }) {
  return jwt.sign(payload, env.DOWNLOAD_TOKEN_SECRET, {
    expiresIn: `${env.DOWNLOAD_URL_TTL_MINUTES}m`,
  });
}

export function verifyDownloadToken(token: string) {
  try {
    return downloadTokenPayloadSchema.parse(jwt.verify(token, env.DOWNLOAD_TOKEN_SECRET));
  } catch {
    throw new AppError(401, "INVALID_DOWNLOAD", "The download link is no longer valid.");
  }
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashSecret(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createOtpCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function createCsrfToken() {
  return crypto.randomBytes(24).toString("base64url");
}
