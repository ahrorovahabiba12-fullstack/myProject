import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { DtmService } from "../../src/services/dtmService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser, createSubject } from "../helpers/fixtures";

async function seedQuestions(subjectCode: string, grade: number, n: number) {
  const subject = await createSubject({ code: subjectCode });
  const topic = await prisma.topic.create({ data: { code: `${subjectCode}-${grade}-1`, subjectId: subject.id, grade, nameUz: "T", nameRu: "T" } });
  for (let i = 0; i < n; i++) {
    await prisma.question.create({
      data: { subjectId: subject.id, topicId: topic.id, grade, text: `Q${i}`, textRu: `Q${i}`, options: ["a", "b", "c"], optionsRu: ["a", "b", "c"], correctIndex: 1, explanation: "chunki b", explanationRu: "потому что b" },
    });
  }
}

describe("DtmService (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("serves a 30-question first block without answers and scores it at 3.1 points", async () => {
    const { student } = await createStudentUser({ grade: 11 });
    await seedQuestions("BIOLOGY", 10, 40);
    const service = new DtmService();

    const started = await service.start(student.id, "BIOLOGY", "first", "uz");
    expect(started.questions).toHaveLength(30);
    expect(started.questions[0]).not.toHaveProperty("correctIndex");

    const answers = started.questions.map((q, i) => ({ questionId: q.id, selectedIndex: i < 20 ? 1 : 0 }));
    const result = await service.submit(student.id, started.dtmToken, answers, "uz");
    expect(result).toMatchObject({ correct: 20, total: 30, points: 62, maxPoints: 93, percent: 67 });
    expect(result.review.find((r) => !r.isCorrect)?.explanation).toBe("chunki b");
  });

  it("widens to lower grades when the upper-grade bank is small, and refuses another student's token", async () => {
    const { student } = await createStudentUser({ grade: 11 });
    const { student: other } = await createStudentUser({ grade: 11 });
    await seedQuestions("MATH", 7, 12);
    const service = new DtmService();

    const started = await service.start(student.id, "MATH", "compulsory", "uz");
    expect(started.questions).toHaveLength(10);
    await expect(service.submit(other.id, started.dtmToken, [], "uz")).rejects.toMatchObject({ statusCode: 403 });
  });

  it("says 'coming soon' for a subject with no questions yet", async () => {
    const { student } = await createStudentUser({ grade: 11 });
    await createSubject({ code: "HISTORY" });
    await expect(new DtmService().start(student.id, "HISTORY", "compulsory", "uz")).rejects.toMatchObject({ statusCode: 404 });
  });
});
