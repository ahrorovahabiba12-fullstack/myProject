import { isDeepStrictEqual } from "util";
import { getAIProvider } from "../providers/ai";
import { RecommendationRepository } from "../repositories/recommendationRepository";
import { StudentRepository } from "../repositories/studentRepository";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { Lang } from "../middleware/language";
import { pick } from "../utils/localize";

export class RecommendationService {
  constructor(
    private ai = getAIProvider(),
    private recRepo = new RecommendationRepository(prisma),
    private studentRepo = new StudentRepository(prisma)
  ) {}

  async getLearningRecommendation(studentId: string, lang: Lang) {
    const student = await this.studentRepo.findById(studentId);
    if (!student) throw AppError.notFound("Student topilmadi");

    const subjectLevels = student.subjectLevels.map((sl) => ({
      subjectCode: sl.subject.code,
      subjectName: pick(sl.subject.nameUz, sl.subject.nameRu, lang),
      level: sl.level,
      score: sl.score,
    }));

    // AI -> (schema validated inside provider) -> business validation -> DB.
    const output = await this.ai.getLearningRecommendation({
      lang,
      grade: student.grade,
      interests: student.interests,
      favoriteSubjects: student.favoriteSubjects,
      subjectLevels,
      goals: student.goals,
    });

    // Business validation: never recommend more than 7 items, confidence in range.
    const items = output.items.slice(0, 7);
    const confidence = Math.min(1, Math.max(0, output.confidence));

    // The dashboard calls this on every load — only store a new row when the
    // recommendation actually changed, instead of one identical row per visit.
    // (Deep-equal, not JSON string compare: jsonb doesn't keep key order.)
    const latest = await this.recRepo.latestByType(studentId, "SUBJECT");
    if (latest && latest.title === output.title && latest.confidence === confidence && isDeepStrictEqual(latest.payload, { items })) {
      return { ...latest, items };
    }
    const saved = await this.recRepo.save(studentId, "SUBJECT", output.title, { items }, confidence);
    return { ...saved, items };
  }
}
