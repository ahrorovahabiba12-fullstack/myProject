import { prisma } from "../config/prisma";
import { CareerRepository } from "../repositories/careerRepository";
import { StudentRepository } from "../repositories/studentRepository";
import { SubjectRepository } from "../repositories/subjectRepository";
import { AppError } from "../utils/AppError";
import { Lang } from "../middleware/language";
import { pick } from "../utils/localize";
import { REGIONS } from "../constants/regions";
import { CAREER_TEST, CREATIVE_EXAM, PHYSICAL_EXAM, RIASEC_TYPES, Riasec } from "../constants/careerTest";
import { CAREER_META } from "../constants/careerMeta";
import { CAREER_DESC_RU } from "../constants/careerDescRu";
import { MIN_CAREER_GRADE } from "./careerService";

const TYPES = Object.keys(RIASEC_TYPES) as Riasec[];
const MAX_PER_TYPE = 2 * (CAREER_TEST.length / TYPES.length);
// A career's first RIASEC type is its most typical one, so it weighs most.
const TYPE_WEIGHTS = [1, 0.7, 0.5];
const RESULT_CAREERS = 8;

// DTM (BMBA) test structure: 3 compulsory subjects, then two specialty subjects.
export const DTM_COMPULSORY = ["MOTHER_LANG", "MATH", "HISTORY"] as const;
export const DTM_BLOCKS = {
  compulsory: { questions: 10, points: 1.1 },
  first: { questions: 30, points: 3.1 },
  second: { questions: 30, points: 2.1 },
  max: 189,
};

const REGION_BY_CODE = new Map<string, (typeof REGIONS)[number]>(REGIONS.map((r) => [r.code, r]));

function programMatches(program: string, keyword: string): boolean {
  const p = program.toLowerCase();
  const k = keyword.toLowerCase();
  // "Veterinary Medicine" is not a programme for doctors or nurses.
  if (p.includes("veterinary") && !k.includes("veterinary")) return false;
  if (k.length <= 3) return new RegExp(`\\b${k}\\b`).test(p);
  return p.includes(k);
}

/** 0..1: how well a student's type scores (0..100) fit a career's types. */
export function riasecMatch(scores: Record<string, number>, careerTypes: string[]): number {
  if (careerTypes.length === 0) return 0;
  let sum = 0;
  let weight = 0;
  careerTypes.slice(0, TYPE_WEIGHTS.length).forEach((t, i) => {
    sum += (scores[t] ?? 0) * TYPE_WEIGHTS[i];
    weight += TYPE_WEIGHTS[i];
  });
  return sum / weight / 100;
}

/** answers[i] is 0 (yo'q), 1 (ba'zan) or 2 (ha) for CAREER_TEST[i]. */
export function scoreTest(answers: number[]): { scores: Record<Riasec, number>; topTypes: Riasec[] } {
  const raw = Object.fromEntries(TYPES.map((t) => [t, 0])) as Record<Riasec, number>;
  CAREER_TEST.forEach((q, i) => (raw[q.type] += answers[i]));
  const scores = Object.fromEntries(TYPES.map((t) => [t, Math.round((raw[t] / MAX_PER_TYPE) * 100)])) as Record<Riasec, number>;
  // Stable order on ties (R, I, A, S, E, C), so the same answers give the same result.
  const topTypes = [...TYPES].sort((a, b) => scores[b] - scores[a]).slice(0, 3);
  return { scores, topTypes };
}

export class CareerChoiceService {
  constructor(
    private careerRepo = new CareerRepository(prisma),
    private studentRepo = new StudentRepository(prisma),
    private subjectRepo = new SubjectRepository(prisma)
  ) {}

  private async eligibleStudent(studentId: string) {
    const student = await this.studentRepo.findById(studentId);
    if (!student) throw AppError.notFound("Student topilmadi");
    if (student.grade < MIN_CAREER_GRADE) {
      throw AppError.forbidden("Kasb tanlash bo'limi 8-sinfdan boshlab mavjud");
    }
    return student;
  }

  private typeInfo(t: Riasec, lang: Lang) {
    const i = RIASEC_TYPES[t];
    return { code: t, name: pick(i.uz, i.ru, lang), description: pick(i.descUz, i.descRu, lang), emoji: i.emoji };
  }

  getTest(lang: Lang) {
    return {
      questions: CAREER_TEST.map((q, index) => ({ index, text: pick(q.uz, q.ru, lang) })),
      types: TYPES.map((t) => this.typeInfo(t, lang)),
    };
  }

  async submitTest(studentId: string, answers: number[], lang: Lang) {
    const student = await this.eligibleStudent(studentId);
    if (answers.length !== CAREER_TEST.length) {
      throw AppError.badRequest(`Barcha ${CAREER_TEST.length} ta savolga javob bering`);
    }
    const { scores, topTypes } = scoreTest(answers);
    const saved = await this.careerRepo.saveTestResult(studentId, scores, topTypes);
    return this.buildResult(student, saved, lang);
  }

  async latest(studentId: string, lang: Lang) {
    const student = await this.eligibleStudent(studentId);
    const saved = await this.careerRepo.latestTestResult(studentId);
    return saved ? this.buildResult(student, saved, lang) : null;
  }

  private async buildResult(
    student: Awaited<ReturnType<CareerChoiceService["eligibleStudent"]>>,
    saved: { scores: unknown; topTypes: string[]; createdAt: Date },
    lang: Lang
  ) {
    const scores = saved.scores as Record<string, number>;
    const subjectScore = new Map(student.subjectLevels.map((sl) => [sl.subject.code, sl.score]));
    const careers = await this.careerRepo.findAll();
    const ranked = careers
      .filter((c) => c.riasec.length > 0)
      .map((c) => {
        const interest = riasecMatch(scores, c.riasec);
        // Quiz results in the two exam subjects nudge the order a little;
        // the interest test stays the main signal.
        const known = c.examSubjects.map((s) => subjectScore.get(s)).filter((v): v is number => v !== undefined);
        const subjects = known.length ? known.reduce((a, b) => a + b, 0) / known.length / 100 : null;
        const matchScore = subjects === null ? interest : 0.85 * interest + 0.15 * subjects;
        return { c, matchScore };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, RESULT_CAREERS);

    const subjects = await this.subjectRepo.findAll();
    const subjectName = new Map(subjects.map((s) => [s.code, pick(s.nameUz, s.nameRu, lang)]));

    return {
      createdAt: saved.createdAt,
      scores: TYPES.map((t) => ({ ...this.typeInfo(t, lang), score: scores[t] ?? 0 })),
      topTypes: saved.topTypes.map((t) => this.typeInfo(t as Riasec, lang)),
      careers: ranked.map(({ c, matchScore }) => ({
        code: c.code,
        name: pick(c.nameUz, c.nameRu, lang),
        description: pick(c.description, CAREER_DESC_RU[c.code] ?? c.description, lang),
        matchScore: Math.round(matchScore * 100) / 100,
        types: c.riasec.map((t) => this.typeInfo(t as Riasec, lang)),
        examSubjects: c.examSubjects.map((s) => subjectName.get(s) ?? s),
      })),
    };
  }

  async careerDetails(studentId: string, code: string, lang: Lang) {
    const student = await this.eligibleStudent(studentId);
    const career = await this.careerRepo.findByCode(code);
    if (!career) throw AppError.notFound("Kasb topilmadi");

    const subjects = await this.subjectRepo.findAll();
    const subjectName = new Map(subjects.map((s) => [s.code, pick(s.nameUz, s.nameRu, lang)]));
    const level = new Map(student.subjectLevels.map((sl) => [sl.subject.code, { level: sl.level, score: sl.score }]));

    const exam = career.examSubjects.map((s, i) => ({
      code: s,
      name: subjectName.get(s) ?? s,
      block: i === 0 ? "first" : "second",
      ...(i === 0 ? DTM_BLOCKS.first : DTM_BLOCKS.second),
      myLevel: level.get(s)?.level ?? null,
      myScore: level.get(s)?.score ?? null,
    }));
    const compulsory = DTM_COMPULSORY.map((s) => ({ code: s, name: subjectName.get(s) ?? s, ...DTM_BLOCKS.compulsory }));
    const extraExam =
      career.extraExam === "creative"
        ? pick(CREATIVE_EXAM.uz, CREATIVE_EXAM.ru, lang)
        : career.extraExam === "physical"
          ? pick(PHYSICAL_EXAM.uz, PHYSICAL_EXAM.ru, lang)
          : null;

    const keywords = CAREER_META[career.code]?.keywords ?? [];
    const universities = (await this.careerRepo.findUniversities())
      .filter((u) => u.programs.some((p) => keywords.some((k) => programMatches(p, k))))
      // The student's own region first, then alphabetical.
      .sort((a, b) => Number(b.region === student.region) - Number(a.region === student.region) || a.nameUz.localeCompare(b.nameUz))
      .map((u) => {
        const region = REGION_BY_CODE.get(u.region);
        return {
          id: u.id,
          name: pick(u.nameUz, u.nameRu, lang),
          description: pick(u.description, u.descriptionRu, lang),
          city: pick(u.city, u.cityRu || u.city, lang),
          regionCode: u.region,
          region: region ? pick(region.nameUz, region.nameRu, lang) : u.region,
          programs: u.programs.filter((p) => keywords.some((k) => programMatches(p, k))),
          website: u.website,
          nearMe: !!student.region && u.region === student.region,
        };
      });

    return {
      code: career.code,
      name: pick(career.nameUz, career.nameRu, lang),
      description: pick(career.description, CAREER_DESC_RU[career.code] ?? career.description, lang),
      types: career.riasec.map((t) => this.typeInfo(t as Riasec, lang)),
      exam: { compulsory, specialty: exam, maxScore: DTM_BLOCKS.max, extra: extraExam },
      universities,
      studentRegion: student.region,
      hasRoadmap: career.roadmapSteps.length > 0,
    };
  }

  async studyCenters(subject: string, region: string | undefined, lang: Lang) {
    const all = await this.careerRepo.findStudyCenters(subject);
    // A centre with no listed region works nationwide/online, so it fits every region.
    const fits = all.filter((c) => !region || c.regions.length === 0 || c.regions.includes(region));
    return fits.map((c) => ({
      code: c.code,
      name: c.name,
      regions: c.regions.map((r) => {
        const info = REGION_BY_CODE.get(r);
        return info ? pick(info.nameUz, info.nameRu, lang) : r;
      }),
      city: pick(c.city, c.cityRu || c.city, lang),
      website: c.website,
      source: c.source,
      sourceUrl: c.sourceUrl,
      verified: c.verified,
    }));
  }
}
