import { Response } from "express";
import { env } from "../config/env";

// Minimal parser for our own "<number><unit>" TTL format (s/m/h/d) — the same
// format already used for JWT_ACCESS_TTL/JWT_REFRESH_TTL — so a cookie's
// maxAge can mirror the token's real lifetime without adding a dependency.
function ttlToMs(ttl: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(ttl);
  if (!match) return 15 * 60 * 1000; // conservative fallback: 15 minutes
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as "s" | "m" | "h" | "d"];
  return Number(match[1]) * unitMs;
}

// Access/refresh tokens are httpOnly cookies, never readable by client-side
// JS — this is what actually closes the "steal a token from localStorage via
// XSS" hole. `secure` is only forced in production so a plain-HTTP local dev
// server keeps working (COOKIE_SECURE overrides it, see config/env.ts).
// `sameSite: "lax"` blocks the cookie from
// being sent on cross-SITE requests (the CSRF vector this would otherwise
// reopen) while still working for the frontend's same-site, cross-origin
// (different port) fetch calls — same-origin-but-different-port counts as
// same-site. A deployment where the frontend and API end up on genuinely
// different top-level domains needs `sameSite: "none"` + a real CSRF token
// instead; this repo's frontend/backend are same-site by design.
const baseCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE ? env.COOKIE_SECURE === "true" : env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("accessToken", accessToken, {
    ...baseCookieOptions,
    path: "/",
    maxAge: ttlToMs(env.JWT_ACCESS_TTL),
  });
  // Scoped to /api/auth only — the browser never attaches it to any other
  // route, shrinking the set of endpoints that ever see the long-lived token.
  res.cookie("refreshToken", refreshToken, {
    ...baseCookieOptions,
    path: "/api/auth",
    maxAge: ttlToMs(env.JWT_REFRESH_TTL),
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("accessToken", { ...baseCookieOptions, path: "/" });
  res.clearCookie("refreshToken", { ...baseCookieOptions, path: "/api/auth" });
}
