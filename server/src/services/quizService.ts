import crypto from "crypto";
import { Badge, Prisma, SubjectLevelEnum } from "@prisma/client";
import { QuizRepository } from "../repositories/quizRepository";
import { StudentRepository } from "../repositories/studentRepository";
import { GamificationService } from "./gamificationService";
import { StudySessionRepository } from "../repositories/studySessionRepository";
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
// full pool for that topic — a pool larger than this is what gives the
// adaptive re-selection below any room to actually vary.
const QUIZ_LENGTH = 10;
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
    private studySessionRepo = new StudySessionRepository(prisma)
  ) {}

  /**
   * Subjects taught in the student's own grade — the first screen of the Test
   * section. Each carries the grade range it is taught in, so the next screen
   * can offer any of those grades (a student may practise an earlier year).
   */
  async listSubjects(studentId: string, lang: Lang) {
    const student = await this.studentRepo.findGrade(studentId);
    if (!student) throw AppError.notFound("Student topilmadi");
    const subjects = await this.repo.findSubjectsWithTopics();
    return {
      grade: student.grade,
      subjects: subjects
        .filter((s) => s.minGrade <= student.grade && student.grade <= s.maxGrade)
        .map((s) => ({
          code: s.code,
          name: pick(s.nameUz, s.nameRu, lang),
          minGrade: s.minGrade,
          maxGrade: s.maxGrade,
          // Grades that actually have at least one topic.
          grades: [...new Set(s.topics.map((t) => t.grade))].sort((x, y) => x - y),
        })),
    };
  }

  /** The yearly topics of one subject in one grade, with how many questions each has. */
  async listTopics(subjectCode: string, grade: number, lang: Lang) {
    const subject = await this.repo.findSubjectByCode(subjectCode);
    if (!subject) throw AppError.notFound("Fan topilmadi");
    const topics = await this.repo.findTopics(subject.id, grade);
    return {
      subject: { code: subject.code, name: pick(subject.nameUz, subject.nameRu, lang) },
      grade,
      topics: topics.map((t) => ({
        id: t.id,
        number: t.sortOrder,
        name: pick(t.nameUz, t.nameRu, lang),
        questionCount: t._count.questions,
      })),
    };
  }

  /** Returns questions WITHOUT correctIndex — the client never sees answers. */
  async startQuiz(studentId: string, topicId: string, lang: Lang) {
    const topic = await this.repo.findTopic(topicId);
    if (!topic) throw AppError.notFound("Mavzu topilmadi");
    const { subjectId, grade } = topic;
    const pool = await this.repo.findTopicQuestionPool(topicId);
    if (pool.length === 0) {
      throw AppError.notFound("Bu mavzu uchun savollar hali qo'shilmagan");
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

    return {
      topic: { id: topic.id, name: pick(topic.nameUz, topic.nameRu, lang), grade },
      subject: { code: topic.subject.code, name: pick(topic.subject.nameUz, topic.subject.nameRu, lang) },
      questions: questions.map((q) => ({
        id: q.id,
        text: pick(q.text, q.textRu, lang),
        options: lang === "ru" && q.optionsRu.length === q.options.length ? q.optionsRu : q.options,
      })),
      // Echoed back on submit, and the only thing submit trusts about this
      // attempt: which questions were served (for which subject/grade) and when
      // it really started — see submitQuiz.
      quizToken: signQuizToken(
        { studentId, subjectId, grade, topicId, questionIds: questions.map((q) => q.id), startedAt: Date.now() },
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
    const topicId = token.topicId ?? null;

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

    // A student may practise an earlier (or later) year's topic — only a quiz
    // at their own grade says anything about their current level in the subject.
    const student = await this.studentRepo.findGrade(studentId);
    const atOwnGrade = student?.grade === grade;

    // Result + subject-level + today's progress + per-question attempt history
    // (feeds the adaptive selection in startQuiz) must land together.
    const [result] = await prisma
      .$transaction([
        prisma.quizResult.create({
          data: { studentId, subjectId, grade, topicId, score, level, attemptDate: new Date(), attemptId: token.jti },
        }),
        ...(atOwnGrade
          ? [
              prisma.subjectLevel.upsert({
                where: { studentId_subjectId: { studentId, subjectId } },
                create: { studentId, subjectId, level, score, source: "quiz" },
                update: { level, score, source: "quiz" },
              }),
            ]
          : []),
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

    // Best-effort like the study-session side effect below: the result is already
    // saved, so a badge-granting hiccup must never turn this into a 500.
    let newBadges: Badge[] = [];
    try {
      newBadges = await this.gamification.evaluateAfterQuiz(studentId);
    } catch {
      /* non-critical side effect — quiz result still stands regardless */
    }

    // Best-effort: record the real quiz-taking time as a QUIZ study session —
    // that is what Progress/analytics count as study minutes. Progress itself
    // was already credited by the $transaction above, so this only adds the
    // session row; a failure here must never fail an already-saved result.
    try {
      const elapsedSeconds = Math.min(
        MAX_CREDITED_QUIZ_SECONDS,
        Math.max(0, Math.round((Date.now() - token.startedAt) / 1000))
      );
      const completedAt = new Date();
      const startedAt = new Date(completedAt.getTime() - elapsedSeconds * 1000);
      await this.studySessionRepo.createCompleted(
        studentId,
        null,
        subjectId,
        startedAt,
        completedAt,
        Math.round(elapsedSeconds / 60),
        elapsedSeconds,
        "QUIZ"
      );
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
        explanation: pick(q.explanation, q.explanationRu, lang) || null,
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
      evaluation: evaluate(score, correctCount, answers.length, lang),
    };
  }
}

/**
 * "Natijangizni baholash": the result on the school's 5-point scale plus a
 * short, honest next step. Deterministic on purpose — no AI call needed to
 * turn a percentage into a mark.
 */
export function evaluate(score: number, correct: number, total: number, lang: Lang) {
  const wrong = total - correct;
  if (score >= 86) {
    return {
      mark: 5,
      title: pick("A'lo!", "Отлично!", lang),
      message: pick(
        `${total} ta savoldan ${correct} tasiga to'g'ri javob berdingiz. Bu mavzuni yaxshi bilasiz.`,
        `Вы правильно ответили на ${correct} из ${total} вопросов. Вы хорошо знаете эту тему.`,
        lang
      ),
      advice: pick("Keyingi mavzuga o'ting yoki qiyinroq sinf darajasini sinab ko'ring.", "Переходите к следующей теме или попробуйте уровень класса посложнее.", lang),
    };
  }
  if (score >= 71) {
    return {
      mark: 4,
      title: pick("Yaxshi!", "Хорошо!", lang),
      message: pick(
        `${total} ta savoldan ${correct} tasi to'g'ri. Bir oz takrorlasangiz, a'lo bo'ladi.`,
        `Правильно ${correct} из ${total}. Немного повторения — и будет отлично.`,
        lang
      ),
      advice: pick(`Xato qilgan ${wrong} ta savolingiz tushuntirishini o'qib, testni yana bir bor yeching.`, `Прочитайте объяснения к ${wrong} ошибкам и решите тест ещё раз.`, lang),
    };
  }
  if (score >= 56) {
    return {
      mark: 3,
      title: pick("Qoniqarli", "Удовлетворительно", lang),
      message: pick(
        `${total} ta savoldan ${correct} tasi to'g'ri. Mavzuning ayrim qismlarini qayta o'rganish kerak.`,
        `Правильно ${correct} из ${total}. Некоторые части темы стоит повторить.`,
        lang
      ),
      advice: pick("Darslikdagi shu mavzuni qayta o'qing, tushunmaganingizni AI maslahatchidan so'rang, so'ng testni qayta yeching.", "Перечитайте эту тему в учебнике, непонятное спросите у AI-советника, затем решите тест снова.", lang),
    };
  }
  return {
    mark: 2,
    title: pick("Yana harakat qiling", "Нужно ещё постараться", lang),
    message: pick(
      `${total} ta savoldan ${correct} tasi to'g'ri. Bu mavzu hali qiyin — bu normal holat, o'rganib olsa bo'ladi.`,
      `Правильно ${correct} из ${total}. Эта тема пока трудная — это нормально, её можно освоить.`,
      lang
    ),
    advice: pick("Mavzuni boshidan o'rganing: avval tushuntirishlarni o'qing, keyin AI maslahatchiga savol bering va testni qayta yeching.", "Изучите тему с начала: прочитайте объяснения, задайте вопросы AI-советнику и решите тест снова.", lang),
  };
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
