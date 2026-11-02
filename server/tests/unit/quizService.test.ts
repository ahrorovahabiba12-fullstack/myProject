import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { QuizService } from "../../src/services/quizService";
import { QuizRepository } from "../../src/repositories/quizRepository";
import { StudentRepository } from "../../src/repositories/studentRepository";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser, createSubject } from "../helpers/fixtures";

// gamification/studySessionRepo stay spies — these tests specifically assert
// on cross-service side-effect wiring (exact call args, resilience when a
// side effect throws), which real DB rows can't observe as directly as a
// spy can. The quiz repository + the $transaction that actually persists
// the result are real, against the test DB.
describe("QuizService — server-side scoring (real DB)", () => {
  const gamification = { evaluateAfterQuiz: vi.fn().mockResolvedValue([]) };
  const studySessionRepo = { createCompleted: vi.fn().mockResolvedValue(undefined) };

  // Questions in these tests are created per subject/grade; this puts all of
  // them into one topic for that subject/grade and starts a quiz on it.
  async function topicFor(subjectId: string, grade: number) {
    const code = `T-${subjectId}-${grade}`;
    const topic = await prisma.topic.upsert({
      where: { code },
      create: { code, subjectId, grade, nameUz: "Mavzu", nameRu: "Тема" },
      update: {},
    });
    await prisma.question.updateMany({ where: { subjectId, grade, topicId: null }, data: { topicId: topic.id } });
    return topic.id;
  }

  async function start(studentId: string, subjectId: string, grade: number, lang: "uz" | "ru" = "uz") {
    return makeService().startQuiz(studentId, await topicFor(subjectId, grade), lang);
  }

  function makeService() {
    return new QuizService(new QuizRepository(prisma), new StudentRepository(prisma), gamification as any, studySessionRepo as any);
  }

  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
    gamification.evaluateAfterQuiz.mockResolvedValue([]);
    studySessionRepo.createCompleted.mockResolvedValue(undefined);
  });
  afterAll(() => prisma.$disconnect());

  it("never sends correctIndex to the client when starting a quiz", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const subject = await createSubject();
    await prisma.question.create({
      data: { subjectId: subject.id, grade: 8, text: "2+2=?", textRu: "2+2=?", options: ["3", "4", "5", "6"], optionsRu: ["3", "4", "5", "6"], correctIndex: 1 },
    });

    const { questions } = await start(student.id, subject.id, 8);

    expect(questions).toHaveLength(1);
    expect(questions[0]).not.toHaveProperty("correctIndex");
    expect(questions[0]).toMatchObject({ text: "2+2=?", options: ["3", "4", "5", "6"] });
  });

  // Every submit goes through a real startQuiz first, so it carries a genuine
  // server-signed quizToken — the only thing submitQuiz trusts about an attempt.
  async function startToken(studentId: string, subjectId: string, grade: number) {
    return (await start(studentId, subjectId, grade)).quizToken;
  }

  it("computes score from actual correctIndex regardless of what the client claims", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const subject = await createSubject();
    const q1 = await prisma.question.create({
      data: { subjectId: subject.id, grade: 8, text: "a", textRu: "a", options: [], optionsRu: [], correctIndex: 1 },
    });
    const q2 = await prisma.question.create({
      data: { subjectId: subject.id, grade: 8, text: "b", textRu: "b", options: [], optionsRu: [], correctIndex: 0 },
    });
    const quizToken = await startToken(student.id, subject.id, 8);

    const result = await makeService().submitQuiz(
      student.id,
      quizToken,
      [
        { questionId: q1.id, selectedIndex: 1 }, // correct
        { questionId: q2.id, selectedIndex: 3 }, // wrong
      ],
      "uz"
    );

    expect(result.correctCount).toBe(1);
    expect(result.score).toBe(50);
    const saved = await prisma.quizResult.findUnique({ where: { id: result.resultId } });
    expect(saved).toMatchObject({ studentId: student.id, subjectId: subject.id, score: 50 });
  });

  it("lets a student practise another grade's topic, without changing their subject level", async () => {
    const { student } = await createStudentUser({ grade: 7 });
    const subject = await createSubject();
    const q = await prisma.question.create({
      data: { subjectId: subject.id, grade: 3, text: "a", textRu: "a", options: ["x", "y"], optionsRu: ["x", "y"], correctIndex: 1 },
    });
    const quizToken = await startToken(student.id, subject.id, 3);

    const result = await makeService().submitQuiz(student.id, quizToken, [{ questionId: q.id, selectedIndex: 1 }], "uz");

    expect(result.score).toBe(100);
    expect(await prisma.subjectLevel.count({ where: { studentId: student.id } })).toBe(0);
    const saved = await prisma.quizResult.findFirstOrThrow({ where: { studentId: student.id } });
    expect(saved.grade).toBe(3);
    expect(saved.topicId).not.toBeNull();
  });

  it("returns the written explanation in the review and a 5-point-scale evaluation", async () => {
    const { student } = await createStudentUser({ grade: 5 });
    const subject = await createSubject();
    const q = await prisma.question.create({
      data: {
        subjectId: subject.id, grade: 5, text: "2+2", textRu: "2+2", options: ["3", "4"], optionsRu: ["3", "4"], correctIndex: 1,
        explanation: "2 ga 2 ni qo'shsak 4 bo'ladi", explanationRu: "2 плюс 2 равно 4",
      },
    });
    const quizToken = await startToken(student.id, subject.id, 5);

    const result = await makeService().submitQuiz(student.id, quizToken, [{ questionId: q.id, selectedIndex: 0 }], "ru");

    expect(result.review[0]).toMatchObject({ isCorrect: false, explanation: "2 плюс 2 равно 4" });
    expect(result.evaluation.mark).toBe(2);
  });

  describe("quizToken — submit is bound to exactly what startQuiz served", () => {
    async function twoQuestionQuiz(grade = 8) {
      const { student } = await createStudentUser({ grade });
      const subject = await createSubject();
      const q1 = await prisma.question.create({
        data: { subjectId: subject.id, grade, text: "a", textRu: "a", options: [], optionsRu: [], correctIndex: 1 },
      });
      const q2 = await prisma.question.create({
        data: { subjectId: subject.id, grade, text: "b", textRu: "b", options: [], optionsRu: [], correctIndex: 0 },
      });
      const quizToken = await startToken(student.id, subject.id, grade);
      return { student, subject, q1, q2, quizToken };
    }

    it("rejects answering only part of the served questions — e.g. just the one already known, for a free 100% (the reported bug)", async () => {
      const { student, q1, quizToken } = await twoQuestionQuiz();

      await expect(
        makeService().submitQuiz(student.id, quizToken, [{ questionId: q1.id, selectedIndex: 1 }], "uz")
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(await prisma.quizResult.count()).toBe(0);
    });

    it("rejects answers for questions this quiz never served, even real ones from the same pool", async () => {
      const { student, subject, q1, quizToken } = await twoQuestionQuiz();
      const notServed = await prisma.question.create({
        data: { subjectId: subject.id, grade: 8, text: "c", textRu: "c", options: [], optionsRu: [], correctIndex: 0 },
      });

      await expect(
        makeService().submitQuiz(
          student.id,
          quizToken,
          [
            { questionId: q1.id, selectedIndex: 1 },
            { questionId: notServed.id, selectedIndex: 0 },
          ],
          "uz"
        )
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("scores a quiz only once — resubmitting it (e.g. with answers corrected from the review) is rejected", async () => {
      const { student, q1, q2, quizToken } = await twoQuestionQuiz();
      const firstTry = [
        { questionId: q1.id, selectedIndex: 0 },
        { questionId: q2.id, selectedIndex: 1 },
      ];
      const corrected = [
        { questionId: q1.id, selectedIndex: 1 },
        { questionId: q2.id, selectedIndex: 0 },
      ];

      const first = await makeService().submitQuiz(student.id, quizToken, firstTry, "uz");
      await expect(makeService().submitQuiz(student.id, quizToken, corrected, "uz")).rejects.toMatchObject({ statusCode: 409 });

      expect(first.score).toBe(0);
      expect(await prisma.quizResult.count({ where: { studentId: student.id } })).toBe(1);
      expect(await prisma.questionAttempt.count({ where: { studentId: student.id } })).toBe(2);
    });

    it("rejects a forged or tampered quiz token", async () => {
      const { student, q1, q2, quizToken } = await twoQuestionQuiz();
      const [header, payload, signature] = quizToken.split(".");
      const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
      const tamperedPayload = Buffer.from(JSON.stringify({ ...decoded, grade: 11 })).toString("base64url");
      const answers = [
        { questionId: q1.id, selectedIndex: 1 },
        { questionId: q2.id, selectedIndex: 0 },
      ];

      await expect(makeService().submitQuiz(student.id, `${header}.${tamperedPayload}.${signature}`, answers, "uz")).rejects.toMatchObject({ statusCode: 400 });
      await expect(makeService().submitQuiz(student.id, "not-a-token", answers, "uz")).rejects.toMatchObject({ statusCode: 400 });
    });

    it("rejects a quiz token that was issued to another student", async () => {
      const { q1, q2, quizToken } = await twoQuestionQuiz();
      const { student: otherStudent } = await createStudentUser({ grade: 8 });

      await expect(
        makeService().submitQuiz(
          otherStudent.id,
          quizToken,
          [
            { questionId: q1.id, selectedIndex: 1 },
            { questionId: q2.id, selectedIndex: 0 },
          ],
          "uz"
        )
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  it("records the quiz as a completed QUIZ study session on submit", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const subject = await createSubject();
    const q1 = await prisma.question.create({
      data: { subjectId: subject.id, grade: 8, text: "a", textRu: "a", options: [], optionsRu: [], correctIndex: 1 },
    });
    const quizToken = await startToken(student.id, subject.id, 8);

    await makeService().submitQuiz(student.id, quizToken, [{ questionId: q1.id, selectedIndex: 1 }], "ru");

    expect(studySessionRepo.createCompleted).toHaveBeenCalledWith(
      student.id,
      null,
      subject.id,
      expect.any(Date),
      expect.any(Date),
      expect.any(Number),
      expect.any(Number),
      "QUIZ"
    );
  });

  describe("credited study time comes from the server-signed start time, never the client", () => {
    afterEach(() => vi.useRealTimers());

    async function completedCallAfter(elapsedMs: number) {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-01T10:00:00"));
      const { student } = await createStudentUser({ grade: 8 });
      const subject = await createSubject();
      const q1 = await prisma.question.create({
        data: { subjectId: subject.id, grade: 8, text: "a", textRu: "a", options: [], optionsRu: [], correctIndex: 1 },
      });
      const quizToken = await startToken(student.id, subject.id, 8);

      vi.setSystemTime(new Date(new Date("2026-10-01T10:00:00").getTime() + elapsedMs));
      await makeService().submitQuiz(student.id, quizToken, [{ questionId: q1.id, selectedIndex: 1 }], "uz");

      return studySessionRepo.createCompleted.mock.calls[0];
    }

    it("records the real elapsed seconds between start and submit", async () => {
      const call = await completedCallAfter(8000);

      expect(call[6]).toBe(8);
    });

    it("caps a quiz left open for hours at 30 credited minutes instead of crediting the whole gap as study", async () => {
      const call = await completedCallAfter(5 * 60 * 60 * 1000);

      expect(call[6]).toBe(30 * 60);
    });
  });

  it("still returns the quiz result even if recording the study session fails on submit", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const subject = await createSubject();
    const q1 = await prisma.question.create({
      data: { subjectId: subject.id, grade: 8, text: "a", textRu: "a", options: [], optionsRu: [], correctIndex: 1 },
    });
    const quizToken = await startToken(student.id, subject.id, 8);
    studySessionRepo.createCompleted.mockRejectedValueOnce(new Error("boom"));

    const result = await makeService().submitQuiz(student.id, quizToken, [{ questionId: q1.id, selectedIndex: 1 }], "uz");

    expect(result.score).toBe(100);
  });

  describe("new badges", () => {
    const firstQuizBadge = { id: "b1", code: "FIRST_QUIZ", nameUz: "Birinchi test", nameRu: "Первый тест", description: "", descriptionRu: "", icon: "🎯" };

    async function oneQuestionQuiz() {
      const { student } = await createStudentUser({ grade: 8 });
      const subject = await createSubject();
      const q1 = await prisma.question.create({
        data: { subjectId: subject.id, grade: 8, text: "a", textRu: "a", options: [], optionsRu: [], correctIndex: 1 },
      });
      const quizToken = await startToken(student.id, subject.id, 8);
      return { student, answers: [{ questionId: q1.id, selectedIndex: 1 }], quizToken };
    }

    it("reports newly earned badges by their localized name, never an internal code like FIRST_QUIZ", async () => {
      gamification.evaluateAfterQuiz.mockResolvedValue([firstQuizBadge]);
      const { student, answers, quizToken } = await oneQuestionQuiz();

      const result = await makeService().submitQuiz(student.id, quizToken, answers, "ru");

      expect(result.newBadges).toEqual(["Первый тест"]);
    });

    it("still returns the saved quiz result if badge evaluation fails (never a 500 after the result is stored)", async () => {
      gamification.evaluateAfterQuiz.mockRejectedValueOnce(new Error("boom"));
      const { student, answers, quizToken } = await oneQuestionQuiz();

      const result = await makeService().submitQuiz(student.id, quizToken, answers, "uz");

      expect(result).toMatchObject({ score: 100, newBadges: [] });
    });
  });

  describe("post-submission review — correctness revealed only after the fact", () => {
    it("includes a per-question review with the correct answer and whether the student got it right", async () => {
      const { student } = await createStudentUser({ grade: 8 });
      const subject = await createSubject();
      const q1 = await prisma.question.create({
        data: { subjectId: subject.id, grade: 8, text: "2+2=?", textRu: "2+2=?", options: ["3", "4"], optionsRu: ["3", "4"], correctIndex: 1 },
      });
      const q2 = await prisma.question.create({
        data: { subjectId: subject.id, grade: 8, text: "3+3=?", textRu: "3+3=?", options: ["5", "6"], optionsRu: ["5", "6"], correctIndex: 1 },
      });
      const quizToken = await startToken(student.id, subject.id, 8);

      const result = await makeService().submitQuiz(
        student.id,
        quizToken,
        [
          { questionId: q1.id, selectedIndex: 1 }, // correct
          { questionId: q2.id, selectedIndex: 0 }, // wrong
        ],
        "uz"
      );

      expect(result.review).toEqual([
        { questionId: q1.id, text: "2+2=?", options: ["3", "4"], selectedIndex: 1, correctIndex: 1, isCorrect: true, explanation: null },
        { questionId: q2.id, text: "3+3=?", options: ["5", "6"], selectedIndex: 0, correctIndex: 1, isCorrect: false, explanation: null },
      ]);
    });

    it("localizes the review text and options for Russian", async () => {
      const { student } = await createStudentUser({ grade: 8 });
      const subject = await createSubject();
      const q1 = await prisma.question.create({
        data: { subjectId: subject.id, grade: 8, text: "2+2=?", textRu: "Сколько 2+2?", options: ["3", "4"], optionsRu: ["три", "четыре"], correctIndex: 1 },
      });
      const quizToken = await startToken(student.id, subject.id, 8);

      const result = await makeService().submitQuiz(student.id, quizToken, [{ questionId: q1.id, selectedIndex: 1 }], "ru");

      expect(result.review[0]).toMatchObject({ text: "Сколько 2+2?", options: ["три", "четыре"] });
    });
  });

  describe("adaptive question selection — wrong answers resurface more often", () => {
    it("records a QuestionAttempt row per answer on submit, with the real correctness", async () => {
      const { student } = await createStudentUser({ grade: 9 });
      const subject = await createSubject();
      const q1 = await prisma.question.create({
        data: { subjectId: subject.id, grade: 9, text: "a", textRu: "a", options: ["x", "y"], optionsRu: ["x", "y"], correctIndex: 0 },
      });
      const q2 = await prisma.question.create({
        data: { subjectId: subject.id, grade: 9, text: "b", textRu: "b", options: ["x", "y"], optionsRu: ["x", "y"], correctIndex: 0 },
      });
      const quizToken = await startToken(student.id, subject.id, 9);

      await makeService().submitQuiz(
        student.id,
        quizToken,
        [
          { questionId: q1.id, selectedIndex: 0 }, // correct
          { questionId: q2.id, selectedIndex: 1 }, // wrong
        ],
        "uz"
      );

      const attempts = await prisma.questionAttempt.findMany({ where: { studentId: student.id } });
      expect(attempts).toHaveLength(2);
      expect(attempts.find((a) => a.questionId === q1.id)?.correct).toBe(true);
      expect(attempts.find((a) => a.questionId === q2.id)?.correct).toBe(false);
    });

    it("selects a question missed last time noticeably more often than one answered correctly last time", async () => {
      const { student } = await createStudentUser({ grade: 9 });
      const subject = await createSubject();
      // A large pool relative to the 5-question quiz length makes selection
      // frequency actually sensitive to weight (a pool close to 5 would
      // include nearly everything regardless of weight).
      const questions = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          prisma.question.create({
            data: { subjectId: subject.id, grade: 9, text: `q${i}`, textRu: `q${i}`, options: ["x", "y"], optionsRu: ["x", "y"], correctIndex: 0 },
          })
        )
      );
      const wrongQuestion = questions[0];
      const correctQuestion = questions[1];
      await prisma.questionAttempt.create({ data: { studentId: student.id, questionId: wrongQuestion.id, correct: false } });
      await prisma.questionAttempt.create({ data: { studentId: student.id, questionId: correctQuestion.id, correct: true } });

      const ROUNDS = 200;
      let wrongCount = 0;
      let correctCount = 0;
      for (let i = 0; i < ROUNDS; i++) {
        const { questions: picked } = await start(student.id, subject.id, 9);
        const ids = new Set(picked.map((q) => q.id));
        if (ids.has(wrongQuestion.id)) wrongCount++;
        if (ids.has(correctQuestion.id)) correctCount++;
      }

      // Weight ratio is 4:1 (wrong:correct) — over 200 rounds the gap should be
      // unmistakable, well clear of any plausible sampling noise.
      expect(wrongCount).toBeGreaterThan(correctCount * 1.5);
    });
  });
});
