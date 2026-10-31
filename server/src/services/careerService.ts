import { getAIProvider } from "../providers/ai";
import { CareerRepository } from "../repositories/careerRepository";
import { StudentRepository } from "../repositories/studentRepository";
import { SubjectRepository } from "../repositories/subjectRepository";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { Lang } from "../middleware/language";
import { pick } from "../utils/localize";
import { REGIONS } from "../constants/regions";

const REGION_NAME_BY_CODE = new Map<string, (typeof REGIONS)[number]>(REGIONS.map((r) => [r.code, r]));

export const MIN_CAREER_GRADE = 8;

// University.programs is free-text (e.g. "Software Engineering", "Medicine") with
// no FK to Subject — this maps each subject to the program keywords it actually
// prepares a student for, so recommendations can be grounded in the student's
// own strong/medium subjects instead of just listing every university as-is.
const SUBJECT_PROGRAM_KEYWORDS: Record<string, string[]> = {
  MATH: ["math", "econom", "financ", "bank", "computer science", "software", "engineer", "electronic", "it", "ai", "management", "marketing", "aviation", "architect"],
  PHYSICS: ["engineer", "electronic", "architect", "aviation", "transport", "mining", "sport"],
  CHEMISTRY: ["medicine", "pharma", "chemical", "dentist", "veterinary", "agronomy", "pediatric", "textile", "fashion"],
  BIOLOGY: ["medicine", "pharma", "dentist", "veterinary", "agronomy", "pediatric", "sport", "agricultural"],
  HISTORY: ["history", "law", "international relations", "journalism", "culture", "islamic", "public relations", "literature", "philolog"],
  ENGLISH: ["foreign language", "translation", "international relations", "business", "marketing", "journalism", "media", "public relations", "management"],
  INFORMATICS: ["computer", "software", "it", "ai", "design", "electronic", "media"],
  MOTHER_LANG: ["philolog", "literature", "pedagog", "primary education", "journalism", "culture", "fine arts", "performing arts", "public relations"],
};

// Most keywords are meant to match as a plain substring, including inside a
// longer word (e.g. "engineer" should match "Engineering"). Very short
// keywords ("it", "ai") need a word-boundary check instead, or they'd
// false-match as a substring of unrelated words (e.g. "it" inside "Literature").
function programMatchesKeyword(program: string, keyword: string): boolean {
  const p = program.toLowerCase();
  const k = keyword.toLowerCase();
  if (k.length <= 3) return new RegExp(`\\b${k}\\b`).test(p);
  return p.includes(k);
}

export class CareerService {
  constructor(
    private ai = getAIProvider(),
    private careerRepo = new CareerRepository(prisma),
    private studentRepo = new StudentRepository(prisma),
    private subjectRepo = new SubjectRepository(prisma)
  ) {}

  private assertEligible(grade: number) {
    if (grade < MIN_CAREER_GRADE) {
      throw AppError.forbidden("Kasb va universitet tavsiyalari 8-sinfdan boshlab mavjud");
    }
  }

  async getCareerRecommendations(studentId: string, lang: Lang) {
    const student = await this.studentRepo.findById(studentId);
    if (!student) throw AppError.notFound("Student topilmadi");
    this.assertEligible(student.grade);

    const subjectLevels = student.subjectLevels.map((sl) => ({
      subjectCode: sl.subject.code,
      subjectName: pick(sl.subject.nameUz, sl.subject.nameRu, lang),
      level: sl.level,
      score: sl.score,
    }));

    const allCareers = await this.careerRepo.findAll();
    const byCode = new Map(allCareers.map((c) => [c.code, c]));

    const output = await this.ai.getCareerRecommendation({
      lang,
      grade: student.grade,
      interests: student.interests,
      careerInterests: student.careerInterests,
      subjectLevels,
      catalog: allCareers.map((c) => ({ code: c.code, requiredSubjects: c.requiredSubjects })),
    });

    const saved = [];
    for (const rec of output.careers) {
      const career = byCode.get(rec.careerCode);
      if (!career) continue; // AI hallucinated a career not in our catalog — skip, don't trust blindly.
      saved.push(
        await this.careerRepo.saveRecommendation(
          studentId,
          career.id,
          Math.min(1, Math.max(0, rec.matchScore)),
          rec.reasoning
        )
      );
    }
    // Drop any previously-saved recommendation this run didn't reproduce — otherwise a
    // career the AI no longer matches (or that was only ever saved by an earlier
    // call/provider/language) would keep showing its stale reasoning forever, mixed in
    // with this run's fresh, correctly-localized ones.
    await this.careerRepo.deleteRecommendationsExcept(
      studentId,
      saved.map((r) => r.careerId)
    );
    const recommendations = await this.careerRepo.listRecommendations(studentId);
    return recommendations.map((r) => ({
      ...r,
      career: { ...r.career, name: pick(r.career.nameUz, r.career.nameRu, lang) },
    }));
  }

  async listRoadmap(studentId: string, careerCode: string, lang: Lang) {
    const student = await this.studentRepo.findById(studentId);
    if (!student) throw AppError.notFound("Student topilmadi");
    this.assertEligible(student.grade);

    const career = await this.careerRepo.findByCode(careerCode);
    if (!career) throw AppError.notFound("Kasb topilmadi");
    return career.roadmapSteps.map((s) => {
      const tasks = lang === "ru" && s.tasksRu.length === s.tasks.length ? s.tasksRu : s.tasks;
      const resources = lang === "ru" && s.resourcesRu.length === s.resources.length ? s.resourcesRu : s.resources;
      return {
        ...s,
        title: pick(s.title, s.titleRu, lang),
        description: pick(s.description, s.descriptionRu, lang),
        tasks,
        resources,
        // Links are language-independent, but only trustworthy when they line
        // up 1:1 with the (possibly-swapped) text array above — otherwise a
        // stale/mismatched link array would point at the wrong task/resource.
        taskLinks: s.taskLinks.length === tasks.length ? s.taskLinks : tasks.map(() => ""),
        resourceUrls: s.resourceUrls.length === resources.length ? s.resourceUrls : resources.map(() => ""),
      };
    });
  }

  async listUniversities(studentId: string, lang: Lang) {
    const student = await this.studentRepo.findById(studentId);
    if (!student) throw AppError.notFound("Student topilmadi");
    this.assertEligible(student.grade);

    // Narrowed to a single top subject (not every strong/medium one) — with
    // 41 real universities in the catalog, scoring against several subjects
    // at once still surfaced nearly all of them. Uses the student's best
    // quiz-derived subject (highest score, whatever its level). A brand-new
    // student with no quiz activity yet gets no list, since there is truly
    // no signal to base one on.
    const bestQuizSubject = [...student.subjectLevels].sort((a, b) => b.score - a.score)[0];
    const topSubjectCode = bestQuizSubject?.subject.code;
    if (!topSubjectCode) {
      return { universities: [], topSubject: null };
    }

    const subjectRow = await this.subjectRepo.findByCode(topSubjectCode);
    const universities = await this.careerRepo.findUniversities();
    const keywords = SUBJECT_PROGRAM_KEYWORDS[topSubjectCode] ?? [];
    const matched = universities.filter((u) => u.programs.some((p) => keywords.some((k) => programMatchesKeyword(p, k))));

    // Region is a hard filter: a student whose parents won't let them study
    // away from home shouldn't have to scroll past universities they can't
    // actually attend. No region set yet -> no region filtering (subject
    // match alone decides), same as before this was added.
    const inRegion = student.region ? matched.filter((u) => u.region === student.region) : matched;

    return {
      topSubject: subjectRow ? pick(subjectRow.nameUz, subjectRow.nameRu, lang) : topSubjectCode,
      universities: inRegion.map((u) => {
        const region = REGION_NAME_BY_CODE.get(u.region);
        return {
          ...u,
          name: pick(u.nameUz, u.nameRu, lang),
          description: pick(u.description, u.descriptionRu, lang),
          city: pick(u.city, u.cityRu || u.city, lang),
          country: pick(u.country, u.countryRu || u.country, lang),
          region: region ? pick(region.nameUz, region.nameRu, lang) : u.region,
        };
      }),
    };
  }

  async listCareerCatalog(lang: Lang) {
    const careers = await this.careerRepo.findAll();
    return careers.map((c) => ({ code: c.code, name: pick(c.nameUz, c.nameRu, lang) }));
  }
}
