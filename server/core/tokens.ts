import crypto from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { AppError } from "./errors.js";

interface AccessTokenPayload {
  sub: string;
  role: "dealer" | "head_office";
  displayName: string;
  email: string | null;
  dealerId?: string | null;
  dealerCode?: string | null;
}

interface DownloadTokenPayload {
  exportId: string;
}

export function createAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
  });
}

export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessTokenPayload;
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Your session has expired.");
  }
}

export function createDownloadToken(payload: DownloadTokenPayload) {
  return jwt.sign(payload, env.DOWNLOAD_TOKEN_SECRET, {
    expiresIn: `${env.DOWNLOAD_URL_TTL_MINUTES}m`,
  });
}

export function verifyDownloadToken(token: string) {
  try {
    return jwt.verify(token, env.DOWNLOAD_TOKEN_SECRET) as DownloadTokenPayload;
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

