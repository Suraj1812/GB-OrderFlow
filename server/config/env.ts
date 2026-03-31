import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_VERSION: z.string().default("1.0.0"),
  API_VERSION: z.string().default("v1"),
  HOST: z.string().default(""),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5432/gb_orderflow?schema=public"),
  CORS_ORIGINS: z.string().default("http://127.0.0.1:5173,http://localhost:5173"),
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(16)
    .default("gb-orderflow-access-secret-dev-only"),
  DOWNLOAD_TOKEN_SECRET: z
    .string()
    .min(16)
    .default("gb-orderflow-download-secret-dev-only"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  DOWNLOAD_URL_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  MAX_LOGIN_FAILURES: z.coerce.number().int().min(3).max(20).default(5),
  ACCOUNT_LOCK_MINUTES: z.coerce.number().int().positive().max(1440).default(15),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  GRACEFUL_SHUTDOWN_MS: z.coerce.number().int().positive().default(10_000),
  BODY_LIMIT_KB: z.coerce.number().int().positive().max(1024).default(200),
  API_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(240),
  AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  AUTH_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
  ALLOW_MULTIPLE_ACTIVE_SESSIONS: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  TRUST_PROXY: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
  FRONTEND_ORIGIN: z.string().default("http://127.0.0.1:5173"),
  API_ORIGIN: z.string().default("http://127.0.0.1:4000"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  DEBUG_MODE: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
  SENTRY_DSN: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
});

const parsed = envSchema.parse(process.env);

process.env.NODE_ENV ??= parsed.NODE_ENV;
process.env.HOST ??= parsed.HOST;
process.env.PORT ??= String(parsed.PORT);
process.env.DATABASE_URL ??= parsed.DATABASE_URL;
process.env.CORS_ORIGINS ??= parsed.CORS_ORIGINS;
process.env.FRONTEND_ORIGIN ??= parsed.FRONTEND_ORIGIN;
process.env.API_ORIGIN ??= parsed.API_ORIGIN;

export const env = {
  ...parsed,
  isProduction: parsed.NODE_ENV === "production",
  host: parsed.HOST.trim() || (parsed.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
  corsOrigins: parsed.CORS_ORIGINS.split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  cookieSecure:
    typeof parsed.COOKIE_SECURE === "boolean"
      ? parsed.COOKIE_SECURE
      : parsed.NODE_ENV === "production",
};

export type AppEnv = typeof env;
