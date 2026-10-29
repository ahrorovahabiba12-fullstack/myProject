# PROJECT_STATUS.md — AI Career & Learning Advisor

_Last updated: 2026-10-25. Reflects the actual, runtime-verified state of the
app — built, run, and tested against a real PostgreSQL database and a real
browser, repeatedly. The project is live: `npm install && npm run dev` boots
both client (5173) and server (4000), and `npm test` runs a real suite
against `ai_advisor_test`._

## Status at a glance

- **Backend**: all verticals below are implemented, migrated, and covered by
  real-DB tests (`server/tests/unit/*`, `server/tests/integration/*`).
- **Frontend**: every student/parent/admin page listed below exists, is
  routed, and has been exercised in a real browser (login → feature → real
  API response → rendered UI).
- **Tests**: `npm --prefix server test` → **199 passing**, 0 failing. All
  real-DB (Postgres), no repository-layer mocking; only genuinely external
  boundaries (the AI provider) are spied.
- **Git**: single clean commit history on `origin/ai-advisor` (GitHub,
  `ahrorovahabiba12-fullstack/ai-advisor`). No secrets in history or working
  tree — `.gitignore` covers `.env`/`.env.*`, `server/.env.example` is the
  template. `node_modules`/`dist` are no longer tracked.

## Completed features

**Auth** — register/login/refresh/logout. JWT access+refresh tokens live in
**httpOnly cookies** (not localStorage) — closes XSS token-theft exposure;
refresh tokens are hashed before storage and rotate on every use; a
`BLOCKED` user is rejected on both login and refresh. Dedicated rate limit
on `/auth/login` and `/auth/register` (10/15min/IP) on top of the global
limiter. Registration grade range is **4–11**, enforced by the server's own
validator too (not just `Register.tsx`'s select). Emails are **stored
lowercased and looked up case-insensitively** (legacy mixed-case rows still
log in) — one inbox can no longer hold two accounts. Every refresh token
carries a random `jti`, so two sessions opened in the same second never sign
identical tokens (logging one out used to leave a valid twin behind).

**Quiz** — 8 subjects × grades **4–11**, all with real, grade-appropriate
questions (not placeholders) in Uzbek + Russian. `correctIndex` never sent
to the client; scoring is always server-recomputed from the DB answer key.
`startQuiz` rejects a `grade` that doesn't match the student's own profile
grade and returns a **signed `quizToken`** (student, subject, grade, the exact
served question ids, start time). `submitQuiz` takes subject/grade/timing
from that token only, requires answers for **exactly** the served questions
(no answering just the one you know for a free 100%), and each token scores
**once** (`QuizResult.attemptId @unique` — the post-submit review can't be
used to resubmit with corrected answers). Credited study time is capped at
30 min per attempt. Badge grants are best-effort (a failure never 500s an
already-saved result) and are reported by localized name. Adaptive question
selection weights a student's own recent wrong/right history per question.

**Schedule** — AI-generated weekly plan, **Monday–Saturday only** (no
Sunday). Both `title` and `titleRu` are generated together and stored side
by side, so a language switch never needs regeneration. "Qayta yaratish"
(regenerate) **only replaces TODO items** — IN_PROGRESS/COMPLETED items and
their StudySession history are preserved — and now asks for confirmation
first. A TODO/IN_PROGRESS item from an earlier day this week is
auto-marked **SKIPPED** the next time the student opens the page (closes a
real "stuck forever in Davom etmoqda" bug). The Play button only appears on
**today's** card. Planned `minutes` are realistic for how a 5-question quiz
actually completes a block (10–15 min primary, 5 min secondary), not an
inflated full-hour estimate, and are clamped to a whole 1–90 before saving
whatever the AI returns. A plan only ever covers **today onward** — a
student joining mid-week no longer sees earlier days instantly "SKIPPED",
regenerating never adds items to past days (a past unfinished item is
recorded as SKIPPED once, not deleted), and on Sunday (rest day) nothing is
generated. **MEDIUM**-level subjects are planned too (previously dropped —
an all-MEDIUM student got a week of subject-less "Umumiy takrorlash").

**Career/University** — gated at `grade >= 9` (`MIN_CAREER_GRADE`), enforced
independently in the sidebar nav, the page itself, and the service layer
(`assertEligible`, before the AI is even called). Career recommendations
regenerate every page load and **drop any recommendation the AI no longer
returns** — a stale/mismatched-language entry can no longer linger
alongside fresh ones.

**AI Chat** — full student context passed to the provider; conversation
scoped by `studentId`. History (UI and AI context) is the **latest** 50
messages — it used to be the first 50, so past 50 every new message vanished
on reload. A failed send (e.g. the chat rate limit) is shown and the text is
handed back for a retry. OpenAI calls time out after 20s and fall back.

**Progress page** — consistency score, study-stats card (completion rate,
actual-vs-planned rate, session count, per-subject breakdown), weekly
activity chart, per-subject levels, on-demand AI analysis. The consistency
score **recomputes on every read** (was cached once/day and went stale
within the same day) and upserts one row per day (`@@unique([studentId,
periodEnd])` — also closes a real race where two parallel requests on page
load each inserted their own row). `sessionCount` now agrees with the
sibling completed-only stats on the same card.

**Gamification** — points, streak, badges (FIRST_QUIZ, SEVEN_DAY_STREAK,
TEN_QUIZZES), idempotent grants.

**Parent module** — `ParentLayout`/`ParentDashboard` pages exist and are
routed. `ParentService.assertOwnership` re-checked on every
method — a parent can never read another family's child via ID. A student
links a parent either at sign-up or later from **Profile** (`PUT
/api/students/me/parent`) — before, sign-up was the only chance, so a parent
who registered after their child could never be linked.

**Notifications** — `NotificationPanel` UI exists and is wired to the real
unread-count/list/mark-read endpoints.

**Subscription** — removed on 2026-10-28 (page, API, payment provider,
admin "premium" stat, `Subscription` table via migration
`20261028180000_remove_subscription`). Premium never gated any feature; the
app is free for everyone. If paid plans come back, decide which features
they unlock and enforce that server-side before wiring a real provider.

**Admin** — `AdminDashboard`/`AdminUsers`, stats, user status management.

**i18n** — uz (default)/ru, parallel key sets, no hardcoded UI strings.

**Client session** — a 401 from `/auth/*` (e.g. a wrong password) is shown
as-is instead of triggering refresh + a page reload that wiped the error;
logout clears the React Query cache so the next user on the same device
never sees the previous user's cached data.

**Docker** — `docker compose up --build` runs Postgres (host port 5433, so
it never collides with a local 5432), the backend and the frontend. Both
images install with **pnpm + the committed lockfile** (same versions as
local dev) and have a `.dockerignore`, so host macOS `node_modules` and
`.env` secrets never end up in an image. The backend runs in
`Asia/Tashkent` (all day-boundary logic is server-local), has OpenSSL for
Prisma, applies migrations, and seeds a brand-new empty database on start
(`prisma:seed-if-empty`) — an existing database is never re-seeded. The
frontend is a **production build served by nginx** (SPA fallback, immutable
`/assets` caching), not the Vite dev server; it waits for the backend's
health check.

**Branding** — logo mark is a growth-trend icon (`components/icons/LogoIcon.tsx`),
used consistently across sidebar/auth/chat/landing/parent header.

## Architecture decisions (still true, worth preserving)

- **Grade gate lives in the service layer**, before any AI call — a
  compromised/hallucinating AI provider can't leak career data to grade<9.
- **AI output never reaches the DB unvalidated**: JSON.parse → zod schema →
  business-rule clamping, before any `prisma.create`/`upsert`.
- **Fallback is structural**: `FallbackAIProvider` wraps the primary once in
  `providers/ai/index.ts` — every service gets fallback behavior for free.
  In the current deployed `.env`, the configured OpenAI key is invalid, so
  `RuleBasedProvider` (a real deterministic implementation, not a stub) is
  what's actually serving every AI-shaped feature right now — the product
  degrades gracefully rather than breaking.
- **Ownership checks happen in the service layer**, not only middleware
  (`ParentService.assertOwnership`, student-scoped repository queries).
- **Quiz correctness is server-authoritative** — see Quiz section above.
- **Bilingual content is generated once and stored side by side**
  (`title`/`titleRu`, `reasoning` regenerated fresh per request) rather than
  translated on read — the pattern to follow for any new AI-generated,
  persisted, user-facing text.

## Known gaps (real, deferred — not urgent)

- Re-running `npm run prisma:seed` by hand on a live database rewrites every
  hand-written question set, and `QuestionAttempt` rows cascade-delete with
  their `Question` — so it wipes students' adaptive-quiz history (and
  invalidates any quiz in progress). Docker only seeds an empty database for
  this reason. Fix if content updates on live data are needed: upsert
  questions by a stable key instead of delete + recreate.
- `docker-compose.yml` is for local use only (placeholder secrets, no TLS,
  demo accounts). Production is `docker-compose.prod.yml` + `Caddyfile` +
  root `.env` (README "Production'ga chiqarish"): Caddy terminates HTTPS and
  serves SPA and `/api` on one origin, every secret is required,
  `NODE_ENV=production` (secure cookies, no stack traces, demo accounts not
  seeded unless `SEED_DEMO_ACCOUNTS=true`), `TRUST_PROXY=1` so rate limits
  key on the real client IP. Single server only, and no DB backups are
  automated.
- **AI Memory UI, Skill Map UI, ParentWeeklyDigest** — schema models exist
  (`StudentGoal`/`Skill`/`StudentSkill`, `ParentWeeklyDigest`), no
  service/routes/UI built yet.
- `QuizRepository.saveResult`/`upsertSubjectLevel` are dead code —
  `QuizService.submitQuiz` does its own inline `prisma.$transaction`
  instead of going through the repository layer for that multi-table
  write. Works correctly as-is; a style/architecture-consistency gap, not a
  bug. Low priority to refactor.

## Demo accounts

| Rol | Email | Parol |
|---|---|---|
| Admin | admin@demo.uz | Demo12345! |
| Ota-ona | parent@demo.uz | Demo12345! |
| O'quvchi (7-sinf) | student7@demo.uz | Demo12345! |
| O'quvchi (8-sinf) | student8@demo.uz | Demo12345! |
| O'quvchi (9-sinf) | student9@demo.uz | Demo12345! |
| O'quvchi (10-sinf) | student10@demo.uz | Demo12345! |
| O'quvchi (11-sinf) | student11@demo.uz | Demo12345! |

All students linked to `parent@demo.uz`. No seeded demo account for grades
4–6 specifically, though real quiz content exists for them — register a new
student (grade selector offers 4–11) to see that path.

## Next steps (if resuming feature work)

In rough priority order, picking up from the "Known gaps" above:
1. Non-destructive question re-seeding (upsert, so `QuestionAttempt`
   history survives content updates).
2. Deployment config beyond one machine (see the Docker known gap above).
3. AI Memory / Skill Map UI, if those features are still wanted.
