import { Badge, Prisma } from "@prisma/client";
import { GamificationRepository } from "../repositories/gamificationRepository";
import { prisma } from "../config/prisma";

/**
 * Badge codes must exist in the seeded Badge catalog (see prisma/seed.ts).
 * Keeping the rule -> code mapping here (not in the database) makes each
 * condition explicit and testable.
 */
export class GamificationService {
  // BUG FIXED (static audit): GamificationRepository requires a PrismaClient;
  // this default arg previously called `new GamificationRepository()` with no
  // argument, which would have thrown at runtime on first use (this.db
  // undefined). Also removed the redundant re-assignment in the old body.
  constructor(private repo = new GamificationRepository(prisma)) {}

  /**
   * Evaluates all badge rules after a quiz submission and grants any newly
   * earned ones (returned as full Badge rows so the caller can show their
   * localized names, never internal codes like "FIRST_QUIZ").
   */
  async evaluateAfterQuiz(studentId: string): Promise<Badge[]> {
    const granted: (Badge | null)[] = [];
    const quizCount = await this.repo.countQuizResults(studentId);

    // ">=" rather than "===": tryGrant is idempotent, and an exact match missed
    // the badge for good whenever the count stepped past the threshold without
    // landing on it (two submits racing 9 -> 11, or a grant that failed once).
    if (quizCount >= 1) granted.push(await this.tryGrant(studentId, "FIRST_QUIZ"));
    if (quizCount >= 10) granted.push(await this.tryGrant(studentId, "TEN_QUIZZES"));

    const streak = await this.currentStreak(studentId);
    if (streak >= 7) granted.push(await this.tryGrant(studentId, "SEVEN_DAY_STREAK"));

    return granted.filter((g): g is Badge => g !== null);
  }

  async currentStreak(studentId: string): Promise<number> {
    const recent = await this.repo.recentProgressDates(studentId, 60);
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    const byDate = new Set(recent.map((p) => p.date.toDateString()));
    while (byDate.has(cursor.toDateString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  private async tryGrant(studentId: string, badgeCode: string): Promise<Badge | null> {
    const badge = await this.repo.findBadgeByCode(badgeCode);
    if (!badge) return null;
    const existing = await this.repo.hasAchievement(studentId, badge.id);
    if (existing) return null;
    try {
      await this.repo.grantAchievement(studentId, badge.id);
    } catch (err) {
      // A concurrent submit granted it between the check above and this
      // insert (@@unique([studentId, badgeId])) — already earned, not an error.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return null;
      throw err;
    }
    return badge;
  }

  listAchievements(studentId: string) {
    return this.repo.listAchievements(studentId);
  }

  /**
   * Full badge catalog with unlock status — powers the "shelf" view (unlocked
   * badges shown in full, locked ones shown greyed out as a goal to work toward).
   * Read-only composition over existing data; grants themselves are unchanged.
   */
  async listAllBadgesWithStatus(studentId: string) {
    const [allBadges, unlocked] = await Promise.all([
      this.repo.findAllBadges(),
      this.repo.listAchievements(studentId),
    ]);
    const unlockedByBadgeId = new Map(unlocked.map((a) => [a.badgeId, a.unlockedAt]));
    return allBadges.map((badge) => ({
      badge,
      unlocked: unlockedByBadgeId.has(badge.id),
      unlockedAt: unlockedByBadgeId.get(badge.id) ?? null,
    }));
  }

  async pointsTotal(studentId: string): Promise<number> {
    // Points = 10 per quiz attempt + 5 per completed schedule task, kept
    // simple and transparent rather than a hidden opaque formula.
    const [quizCount, completedTasks] = await Promise.all([
      prisma.quizResult.count({ where: { studentId } }),
      prisma.schedule.count({ where: { studentId, status: "COMPLETED" } }),
    ]);
    return quizCount * 10 + completedTasks * 5;
  }
}
