import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_ACCESS_SECRET: z.string().min(10, "JWT_ACCESS_SECRET must be set"),
  JWT_REFRESH_SECRET: z.string().min(10, "JWT_REFRESH_SECRET must be set"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  AI_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  AI_API_KEY: z.string().optional().default(""),
  AI_MODEL: z.string().optional().default(""),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  // Number of reverse proxies in front of the API (Caddy in
  // docker-compose.prod.yml = 1). Without it every request looks like it
  // comes from the proxy's IP, so all users share one rate-limit bucket.
  // Left at 0 when nothing sits in front, so clients can't spoof their IP
  // through X-Forwarded-For.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
}).superRefine((cfg, ctx) => {
  if (cfg.NODE_ENV !== "production") return;
  // Tokens signed with a short or guessable secret can be forged offline.
  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const) {
    if (cfg[key].length < 32) {
      ctx.addIssue({ code: "custom", path: [key], message: `${key} must be at least 32 characters in production` });
    }
  }
  if (cfg.JWT_ACCESS_SECRET === cfg.JWT_REFRESH_SECRET) {
    ctx.addIssue({ code: "custom", path: ["JWT_REFRESH_SECRET"], message: "must differ from JWT_ACCESS_SECRET" });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loud — a misconfigured environment must never boot silently.
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
