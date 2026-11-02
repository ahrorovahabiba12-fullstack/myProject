import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { Lang } from "../middleware/language";
import { pick } from "../utils/localize";
import { signDtmToken, verifyDtmToken, DtmTokenPayload } from "../utils/jwt";
import { DTM_BLOCKS, DTM_COMPULSORY } from "./careerChoiceService";
import { notifier } from "./notifier";

type Block = DtmTokenPayload["block"];

// DTM tests cover the whole school course, so practice draws on the upper
// grades of our question bank; if that is too small, it widens to grade 7+.
const MAIN_GRADES = [9, 10, 11];
const WIDE_GRADES = [7, 8, 9, 10, 11];

function blockSpec(block: Block) {
  return block === "compulsory" ? DTM_BLOCKS.compulsory : block === "first" ? DTM_BLOCKS.first : DTM_BLOCKS.second;
}

function sample<T>(items: T[], n: number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export class DtmService {
  constructor(private db = prisma) {}

  async listSubjects(lang: Lang) {
    const subjects = await this.db.subject.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
    const counts = await this.db.question.groupBy({
      by: ["subjectId"],
      where: { grade: { in: WIDE_GRADES }, topicId: { not: null } },
      _count: { _all: true },
    });
    const count = new Map(counts.map((c) => [c.subjectId, c._count._all]));
    return {
      blocks: DTM_BLOCKS,
      compulsory: [...DTM_COMPULSORY],
      subjects: subjects.map((s) => ({
        code: s.code,
        name: pick(s.nameUz, s.nameRu, lang),
        available: count.get(s.id) ?? 0,
        compulsory: (DTM_COMPULSORY as readonly string[]).includes(s.code),
      })),
    };
  }

  async start(studentId: string, subjectCode: string, block: Block, lang: Lang) {
    const subject = await this.db.subject.findUnique({ where: { code: subjectCode } });
    if (!subject) throw AppError.notFound("Fan topilmadi");
    const spec = blockSpec(block);
    let pool = await this.db.question.findMany({ where: { subjectId: subject.id, grade: { in: MAIN_GRADES }, topicId: { not: null } } });
    if (pool.length < spec.questions) {
      pool = await this.db.question.findMany({ where: { subjectId: subject.id, grade: { in: WIDE_GRADES }, topicId: { not: null } } });
    }
    if (pool.length === 0) throw AppError.notFound("Bu fan bo'yicha DTM savollari tez orada qo'shiladi");

    const picked = sample(pool, spec.questions);
    const token = signDtmToken({ studentId, subjectCode, block, questionIds: picked.map((q) => q.id), startedAt: Date.now() });
    return {
      subject: { code: subject.code, name: pick(subject.nameUz, subject.nameRu, lang) },
      block,
      points: spec.points,
      questions: picked.map((q) => ({ id: q.id, text: pick(q.text, q.textRu, lang), options: lang === "ru" ? q.optionsRu : q.options, grade: q.grade })),
      dtmToken: token,
    };
  }

  async submit(studentId: string, dtmToken: string, answers: { questionId: string; selectedIndex: number }[], lang: Lang) {
    let token: DtmTokenPayload;
    try {
      token = verifyDtmToken(dtmToken);
    } catch {
      throw AppError.badRequest("Test muddati tugagan yoki noto'g'ri. Qaytadan boshlang.");
    }
    if (token.studentId !== studentId) throw AppError.forbidden();

    const spec = blockSpec(token.block);
    const questions = await this.db.question.findMany({ where: { id: { in: token.questionIds } } });
    const byId = new Map(questions.map((q) => [q.id, q]));
    const chosen = new Map(answers.map((a) => [a.questionId, a.selectedIndex]));

    const review = token.questionIds
      .map((id) => byId.get(id))
      .filter((q): q is NonNullable<typeof q> => !!q)
      .map((q) => {
        const selected = chosen.get(q.id) ?? null;
        const explanation = pick(q.explanation, q.explanationRu, lang);
        return {
          questionId: q.id,
          text: pick(q.text, q.textRu, lang),
          options: lang === "ru" ? q.optionsRu : q.options,
          selectedIndex: selected,
          correctIndex: q.correctIndex,
          isCorrect: selected === q.correctIndex,
          explanation: explanation || null,
        };
      });
    const correct = review.filter((r) => r.isCorrect).length;
    const total = review.length;
    const points = Math.round(correct * spec.points * 10) / 10;
    const maxPoints = Math.round(total * spec.points * 10) / 10;
    const subjectRow = await this.db.subject.findFirst({ where: { code: token.subjectCode }, select: { nameUz: true, nameRu: true } });
    if (subjectRow) await notifier.dtmCompleted(studentId, subjectRow, points, maxPoints);
    return {
      block: token.block,
      correct,
      total,
      points,
      maxPoints,
      percent: total ? Math.round((correct / total) * 100) : 0,
      review,
    };
  }
}
