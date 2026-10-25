import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { GamificationService } from "../../src/services/gamificationService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser, createBadge, createSubject } from "../helpers/fixtures";

describe("GamificationService.listAllBadgesWithStatus (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("marks badges the student has unlocked as unlocked, with their unlock date", async () => {
    const { student } = await createStudentUser();
    const b1 = await createBadge({ code: "FIRST_QUIZ" });
    const b2 = await createBadge({ code: "SEVEN_DAY_STREAK" });
    const unlockedAt = new Date("2026-01-01");
    await prisma.achievement.create({ data: { studentId: student.id, badgeId: b1.id, unlockedAt } });

    const result = await new GamificationService().listAllBadgesWithStatus(student.id);

    expect(result).toEqual([
      { badge: expect.objectContaining({ id: b1.id, code: "FIRST_QUIZ" }), unlocked: true, unlockedAt },
      { badge: expect.objectContaining({ id: b2.id, code: "SEVEN_DAY_STREAK" }), unlocked: false, unlockedAt: null },
    ]);
  });

  it("returns every badge in the catalog as locked when the student has unlocked none yet", async () => {
    const { student } = await createStudentUser();
    const badge = await createBadge({ code: "FIRST_QUIZ" });

    const result = await new GamificationService().listAllBadgesWithStatus(student.id);

    expect(result).toEqual([{ badge: expect.objectContaining({ id: badge.id, code: "FIRST_QUIZ" }), unlocked: false, unlockedAt: null }]);
  });
});

describe("GamificationService.evaluateAfterQuiz (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  async function addQuizResults(studentId: string, count: number) {
    const subject = await createSubject();
    await prisma.quizResult.createMany({
      data: Array.from({ length: count }, () => ({ studentId, subjectId: subject.id, grade: 9, score: 80, level: "STRONG" as const, attemptDate: new Date() })),
    });
  }

  it("still grants TEN_QUIZZES when the count steps past 10 without landing exactly on it", async () => {
    const { student } = await createStudentUser();
    await createBadge({ code: "FIRST_QUIZ" });
    await createBadge({ code: "TEN_QUIZZES" });
    await addQuizResults(student.id, 11);

    const granted = await new GamificationService().evaluateAfterQuiz(student.id);

    expect(granted.map((b) => b.code).sort()).toEqual(["FIRST_QUIZ", "TEN_QUIZZES"]);
  });

  it("never grants the same badge twice", async () => {
    const { student } = await createStudentUser();
    await createBadge({ code: "FIRST_QUIZ" });
    await addQuizResults(student.id, 2);
    const service = new GamificationService();

    await service.evaluateAfterQuiz(student.id);
    const second = await service.evaluateAfterQuiz(student.id);

    expect(second).toEqual([]);
    expect(await prisma.achievement.count({ where: { studentId: student.id } })).toBe(1);
  });
});
