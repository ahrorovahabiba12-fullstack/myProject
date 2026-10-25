import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { RecommendationService } from "../../src/services/recommendationService";
import { RuleBasedProvider } from "../../src/providers/ai/RuleBasedProvider";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser, createSubject } from "../helpers/fixtures";

// The real, deterministic RuleBasedProvider (not a spy): whether two calls
// produce "the same" recommendation is exactly what's under test here.
describe("RecommendationService.getLearningRecommendation — one row per real change (real DB)", () => {
  function makeService() {
    return new RecommendationService(new RuleBasedProvider());
  }

  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("does not store an identical recommendation again on every dashboard load", async () => {
    const { student } = await createStudentUser();
    const math = await createSubject({ code: "MATH" });
    await prisma.subjectLevel.create({ data: { studentId: student.id, subjectId: math.id, level: "WEAK", score: 30, source: "quiz" } });

    const first = await makeService().getLearningRecommendation(student.id, "uz");
    const second = await makeService().getLearningRecommendation(student.id, "uz");

    expect(second.items).toEqual(first.items);
    expect(await prisma.recommendation.count({ where: { studentId: student.id } })).toBe(1);
  });

  it("stores a new row once the recommendation genuinely changes", async () => {
    const { student } = await createStudentUser();
    const math = await createSubject({ code: "MATH" });
    const level = await prisma.subjectLevel.create({
      data: { studentId: student.id, subjectId: math.id, level: "WEAK", score: 30, source: "quiz" },
    });

    await makeService().getLearningRecommendation(student.id, "uz");
    await prisma.subjectLevel.update({ where: { id: level.id }, data: { level: "STRONG", score: 90 } });
    const updated = await makeService().getLearningRecommendation(student.id, "uz");

    expect(updated.items[0].minutesPerWeek).toBe(60);
    expect(await prisma.recommendation.count({ where: { studentId: student.id } })).toBe(2);
  });
});
