import crypto from "crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "@prisma/client";

export interface AccessTokenPayload {
  userId: string;
  role: Role;
  studentId?: string;
  parentId?: string;
}

// jsonwebtoken's SignOptions.expiresIn is typed as `number | ms.StringValue`
// (a template-literal union from the `ms` package), not a plain `string`.
// env.JWT_ACCESS_TTL/JWT_REFRESH_TTL are validated by zod as strings in the
// documented "15m"/"30d" format (see .env.example), so this narrowing cast
// to the library's own exact expected type is correct — not an `any` escape
// hatch, just telling TS what we already guarantee at the env-validation layer.
const accessTokenOptions: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"] };
const refreshTokenOptions: SignOptions = { expiresIn: env.JWT_REFRESH_TTL as SignOptions["expiresIn"] };

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, accessTokenOptions);

// A random jwtid makes every refresh token unique — without it, two sessions
// issued for the same user within the same second signed byte-identical
// tokens (same payload + iat), so revoking one on logout left an identical,
// still-valid twin row behind.
export const signRefreshToken = (userId: string): string =>
  jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { ...refreshTokenOptions, jwtid: crypto.randomUUID() });

// `algorithms` is pinned explicitly rather than left to jsonwebtoken's
// default inference — otherwise a token whose header simply claims a
// different algorithm than the one this app actually signs with would still
// be handed to the verifier to sort out, which is exactly the shape of past
// real-world JWT "algorithm confusion" bugs. Pinning it makes any such token
// fail before the signature is even checked.
export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] }) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): { userId: string } =>
  jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as { userId: string };

// Binds a quiz submission to exactly what startQuiz served: which questions,
// for which student/subject/grade, and when it really started. Signed with its
// own key (derived from the access secret) so a quiz token can never pass as
// an access token, or the other way round.
export interface QuizTokenPayload {
  studentId: string;
  subjectId: string;
  grade: number;
  questionIds: string[];
  startedAt: number; // epoch ms — iat alone only has 1-second precision
}

const quizTokenSecret = crypto.createHmac("sha256", env.JWT_ACCESS_SECRET).update("quiz-attempt-token").digest("hex");
// Generous on purpose: an expired token rejects the student's answers outright.
// Credited study time is capped separately (QuizService), so a quiz left open
// for hours can still be submitted without inflating anything.
const QUIZ_TOKEN_TTL = "24h";

export const signQuizToken = (payload: QuizTokenPayload, attemptId: string): string =>
  jwt.sign(payload, quizTokenSecret, { expiresIn: QUIZ_TOKEN_TTL, jwtid: attemptId });

export const verifyQuizToken = (token: string): QuizTokenPayload & { jti: string } =>
  jwt.verify(token, quizTokenSecret, { algorithms: ["HS256"] }) as QuizTokenPayload & { jti: string };
