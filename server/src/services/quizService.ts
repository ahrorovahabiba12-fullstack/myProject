import crypto from "crypto";
import { Badge, Prisma, SubjectLevelEnum } from "@prisma/client";
import { QuizRepository } from "../repositories/quizRepository";
import { StudentRepository } from "../repositories/studentRepository";
import { GamificationService } from "./gamificationService";
import { ScheduleService } from "./scheduleService";
import { AppError } from "../utils/AppError";
import { prisma } from "../config/prisma";
import { Lang } from "../middleware/language";
import { pick } from "../utils/localize";
import { weightedSampleWithoutReplacement } from "../utils/weightedSample";
import { signQuizToken, verifyQuizToken } from "../utils/jwt";

const levelFromScore = (score: number): SubjectLevelEnum => {
  if (score >= 80) return "STRONG";
  if (score >= 50) return "MEDIUM";
  return "WEAK";
};

// How many questions a single quiz attempt shows, drawn (weighted) from the
// full pool for that subject/grade — a pool larger than this is what gives
// the adaptive re-selection below any room to actually vary.
const QUIZ_LENGTH = 5;
// Relative selection weights, keyed by the student's own most recent
// outcome on that exact question: missed last time -> favored to reappear
// soon; got it right -> still possible ("kamdan-kam" = rarely), never
// permanently excluded; never attempted -> plain baseline.
const WEIGHT_NEVER_ATTEMPTED = 2;
const WEIGHT_WRONG_LAST_TIME = 4;
const WEIGHT_CORRECT_LAST_TIME = 1;
// Most study time one quiz attempt can credit. A short 5-question quiz never
// genuinely takes longer than this; a tab left open overnight still counts as
// at most this much, not as many hours of "study".
const MAX_CREDITED_QUIZ_SECONDS = 30 * 60;

export class QuizService {
  constructor(
    private repo = new QuizRepository(prisma),
    private studentRepo = new StudentRepository(prisma),
    private gamification = new GamificationService(),
    private scheduleService = new ScheduleService()
  ) {}

  // grade is client-supplied on startQuiz, purely to pick which question pool
  // to serve — the frontend only ever sends the student's own profile grade
  // (never lets them pick another), so nothing legitimate breaks by enforcing
  // that server-side too. Without this, a tampered request could fetch a
  // different grade's content and (via its quizToken) have it scored into
  // that student's real QuizResult history.
  private async assertOwnGrade(studentId: string, grade: number) {
    const student = await this.studentRepo.findGrade(studentId);
    if (!student) throw AppError.notFound("Student topilmadi");
    if (student.grade !== grade) {
      throw AppError.badRequest("So'ralgan sinf sizning profilingizdagi sinfga mos kelmaydi");
    }
  }

  /** Returns questions WITHOUT correctIndex — the client never sees answers. */
  async startQuiz(studentId: string, subjectId: string, grade: number, lang: Lang) {
    await this.assertOwnGrade(studentId, grade);
    const pool = await this.repo.findQuestionPool(subjectId, grade);
    if (pool.length === 0) {
      throw AppError.notFound("Bu fan va sinf uchun testlar hali qo'shilmagan");
    }

    const recentAttempts = await this.repo.findRecentAttempts(studentId, pool.map((q) => q.id));
    const lastOutcomeByQuestion = new Map<string, boolean>();
    for (const a of recentAttempts) {
      // recentAttempts is ordered most-recent-first — keep only the first
      // (= latest) outcome seen per question.
      if (!lastOutcomeByQuestion.has(a.questionId)) lastOutcomeByQuestion.set(a.questionId, a.correct);
    }
    const weights = pool.map((q) => {
      const last = lastOutcomeByQuestion.get(q.id);
      if (last === undefined) return WEIGHT_NEVER_ATTEMPTED;
      return last ? WEIGHT_CORRECT_LAST_TIME : WEIGHT_WRONG_LAST_TIME;
    });
    const questions = weightedSampleWithoutReplacement(pool, weights, QUIZ_LENGTH);

    // Best-effort: if today's schedule has a TODO task for this subject, starting a quiz
    // on it is exactly the "studying this subject" signal — move it to IN_PROGRESS
    // automatically. A schedule-linking failure must never block the quiz itself.
    try {
      await this.scheduleService.autoTransitionForSubject(studentId, subjectId, "IN_PROGRESS");
    } catch {
      /* non-critical side effect — quiz continues regardless */
    }

    return {
      questions: questions.map((q) => ({
        id: q.id,
        text: pick(q.text, q.textRu, lang),
        options: lang === "ru" && q.optionsRu.length === q.options.length ? q.optionsRu : q.options,
      })),
      // Echoed back on submit, and the only thing submit trusts about this
      // attempt: which questions were served (for which subject/grade) and when
      // it really started — see submitQuiz.
      quizToken: signQuizToken(
        { studentId, subjectId, grade, questionIds: questions.map((q) => q.id), startedAt: Date.now() },
        crypto.randomUUID()
      ),
    };
  }

  /**
   * answers: [{questionId, selectedIndex}]. Score is computed server-side;
   * a wrong client-declared score is never trusted. Subject, grade, the served
   * question set and the start time all come from startQuiz's signed quizToken,
   * never from the request — so a client can't answer only the questions it
   * already knows, claim another subject/grade, fake its study time, or
   * resubmit the same quiz with answers corrected from the review.
   */
  async submitQuiz(
    studentId: string,
    quizToken: string,
    answers: { questionId: string; selectedIndex: number }[],
    lang: Lang
  ) {
    let token: ReturnType<typeof verifyQuizToken>;
    try {
      token = verifyQuizToken(quizToken);
    } catch {
      throw AppError.badRequest("Test sessiyasi yaroqsiz yoki muddati tugagan. Testni qaytadan boshlang.");
    }
    if (token.studentId !== studentId) {
      throw AppError.forbidden("Bu test sizga tegishli emas");
    }
    const { subjectId, grade } = token;

    // Exactly the served questions, each answered once — a subset (e.g. the one
    // question the student already knows, for a free 100%) or extras are rejected.
    const served = new Set(token.questionIds);
    const answered = new Set(answers.map((a) => a.questionId));
    if (answers.length !== served.size || answered.size !== served.size || [...answered].some((id) => !served.has(id))) {
      throw AppError.badRequest("Javoblar ushbu testdagi savollarga mos kelmaydi");
    }

    const questions = await this.repo.findQuestionsByIds(token.questionIds);
    if (questions.length !== served.size) {
      throw AppError.badRequest("Ba'zi savollar topilmadi");
    }

    const questionById = new Map(questions.map((q) => [q.id, q]));
    const attemptRecords = answers.map((a) => ({
      questionId: a.questionId,
      correct: questionById.get(a.questionId)?.correctIndex === a.selectedIndex,
    }));
    const correctCount = attemptRecords.filter((a) => a.correct).length;
    const score = Math.round((correctCount / answers.length) * 100);
    const level = levelFromScore(score);

    // Result + subject-level + today's progress + per-question attempt history
    // (feeds the adaptive selection in startQuiz) must land together.
    const [result] = await prisma
      .$transaction([
        prisma.quizResult.create({
          data: { studentId, subjectId, grade, score, level, attemptDate: new Date(), attemptId: token.jti },
        }),
        prisma.subjectLevel.upsert({
          where: { studentId_subjectId: { studentId, subjectId } },
          create: { studentId, subjectId, level, score, source: "quiz" },
          update: { level, score, source: "quiz" },
        }),
        prisma.progress.upsert({
          where: { studentId_date: { studentId, date: startOfToday() } },
          create: { studentId, date: startOfToday(), completedTasks: 1, studyMinutes: 0, scoreDelta: score },
          update: { completedTasks: { increment: 1 }, scoreDelta: { increment: score } },
        }),
        prisma.questionAttempt.createMany({
          data: attemptRecords.map((a) => ({ studentId, questionId: a.questionId, correct: a.correct })),
        }),
      ])
      .catch((err) => {
        // QuizResult.attemptId is unique — this exact served quiz was already submitted.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          throw AppError.conflict("Bu test allaqachon topshirilgan. Yangi test boshlang.");
        }
        throw err;
      });

    // Best-effort like the schedule side effect below: the result is already
    // saved, so a badge-granting hiccup must never turn this into a 500.
    let newBadges: Badge[] = [];
    try {
      newBadges = await this.gamification.evaluateAfterQuiz(studentId);
    } catch {
      /* non-critical side effect — quiz result still stands regardless */
    }

    // Same best-effort auto-transition as startQuiz — mirrors the manual "Tugatdim"
    // flow, but deliberately does NOT credit Progress again here: the $transaction
    // above already credited completedTasks/scoreDelta for this exact real-world
    // action (solving this subject's problems), so ScheduleService.autoTransitionForSubject
    // only updates status/StudySession, never Progress, avoiding a double-count.
    try {
      const elapsedSeconds = Math.min(
        MAX_CREDITED_QUIZ_SECONDS,
        Math.max(0, Math.round((Date.now() - token.startedAt) / 1000))
      );
      await this.scheduleService.autoTransitionForSubject(studentId, subjectId, "COMPLETED", score, elapsedSeconds);
    } catch {
      /* non-critical side effect — quiz result still stands regardless */
    }

    // Correctness is revealed only now, AFTER submission — never while the quiz is in
    // progress. This is a post-hoc review, not a way to see answers before answering.
    const review = answers.map((a) => {
      const q = questionById.get(a.questionId)!;
      const options = lang === "ru" && q.optionsRu.length === q.options.length ? q.optionsRu : q.options;
      return {
        questionId: a.questionId,
        text: pick(q.text, q.textRu, lang),
        options,
        selectedIndex: a.selectedIndex,
        correctIndex: q.correctIndex,
        isCorrect: a.selectedIndex === q.correctIndex,
      };
    });

    return {
      score,
      level,
      correctCount,
      total: answers.length,
      resultId: result.id,
      newBadges: newBadges.map((b) => pick(b.nameUz, b.nameRu, lang)),
      review,
    };
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
