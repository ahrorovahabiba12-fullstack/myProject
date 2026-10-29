import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { languageMiddleware } from "./middleware/language";

import { authRouter } from "./routes/authRoutes";
import { studentRouter } from "./routes/studentRoutes";
import { quizRouter } from "./routes/quizRoutes";
import { recommendationRouter } from "./routes/recommendationRoutes";
import { careerRouter } from "./routes/careerRoutes";
import { chatRouter } from "./routes/chatRoutes";
import { scheduleRouter } from "./routes/scheduleRoutes";
import { progressRouter } from "./routes/progressRoutes";
import { parentRouter } from "./routes/parentRoutes";
import { notificationRouter } from "./routes/notificationRoutes";
import { subjectRouter } from "./routes/subjectRoutes";
import { achievementRouter } from "./routes/achievementRoutes";
import { dailyCoachRouter } from "./routes/dailyCoachRoutes";
import { consistencyRouter } from "./routes/consistencyRoutes";
import { studyAnalyticsRouter } from "./routes/studyAnalyticsRoutes";
import { adminRouter } from "./routes/adminRoutes";

export const app = express();

app.set("trust proxy", env.TRUST_PROXY);
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(languageMiddleware);

// API responses vary by X-Lang, but browsers cache GETs by URL alone and
// don't know to key on that header without an explicit Vary — without this,
// a response fetched once in Uzbek can be served back verbatim after the
// user switches to Russian. Every API response opts out of caching entirely.
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Global rate limit — generous for normal use, tight enough to blunt abuse.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// AI chat gets its own tighter limit since each call can hit a paid provider.
const chatLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20 });

// Login/register get a much tighter per-IP limit than the global one above —
// the global 300/15min is sized for normal app usage across many endpoints,
// far too generous to meaningfully slow down password guessing against a
// single account. This doesn't replace per-account lockout, but it caps how
// many credentials one IP can try in a window.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring." } },
});

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth", authRouter);
app.use("/api/students", studentRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/recommendations", recommendationRouter);
app.use("/api/career", careerRouter);
app.use("/api/chat", chatLimiter, chatRouter);
app.use("/api/schedule", scheduleRouter);
app.use("/api/progress", progressRouter);
app.use("/api/parent", parentRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/subjects", subjectRouter);
app.use("/api/achievements", achievementRouter);
app.use("/api/daily-coach", dailyCoachRouter);
app.use("/api/consistency", consistencyRouter);
app.use("/api/study-analytics", studyAnalyticsRouter);
app.use("/api/admin", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);
