import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
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
  EMAIL_FROM: z.string().email().optional(),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  isProduction: parsed.NODE_ENV === "production",
  corsOrigins: parsed.CORS_ORIGINS.split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  cookieSecure:
    typeof parsed.COOKIE_SECURE === "boolean"
      ? parsed.COOKIE_SECURE
      : parsed.NODE_ENV === "production",
};

export type AppEnv = typeof env;
