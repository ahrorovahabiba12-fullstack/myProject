import { PrismaClient } from "@prisma/client";

export class CareerRepository {
  constructor(private db: PrismaClient) {}

  findAll() {
    return this.db.career.findMany();
  }

  findByCode(code: string) {
    return this.db.career.findUnique({ where: { code }, include: { roadmapSteps: { orderBy: { order: "asc" } } } });
  }

  saveRecommendation(studentId: string, careerId: string, matchScore: number, reasoning: string) {
    return this.db.careerRecommendation.upsert({
      where: { studentId_careerId: { studentId, careerId } },
      create: { studentId, careerId, matchScore, reasoning },
      update: { matchScore, reasoning },
    });
  }

  listRecommendations(studentId: string) {
    return this.db.careerRecommendation.findMany({
      where: { studentId },
      include: { career: true },
      orderBy: { matchScore: "desc" },
    });
  }

  // A career the AI no longer returns (dropped interest match, or this run fell back
  // to a different provider than the one that produced the stale row) must not keep
  // showing its old reasoning forever — including in whatever language/provider that
  // old row happened to be generated with.
  deleteRecommendationsExcept(studentId: string, keepCareerIds: string[]) {
    return this.db.careerRecommendation.deleteMany({
      where: { studentId, careerId: { notIn: keepCareerIds } },
    });
  }

  findUniversities() {
    return this.db.university.findMany();
  }

  saveUniversityRecommendation(studentId: string, universityId: string, matchScore: number, reasoning: string) {
    return this.db.universityRecommendation.upsert({
      where: { studentId_universityId: { studentId, universityId } },
      create: { studentId, universityId, matchScore, reasoning },
      update: { matchScore, reasoning },
    });
  }

  saveTestResult(studentId: string, scores: Record<string, number>, topTypes: string[]) {
    return this.db.careerTestResult.create({ data: { studentId, scores, topTypes } });
  }

  latestTestResult(studentId: string) {
    return this.db.careerTestResult.findFirst({ where: { studentId }, orderBy: { createdAt: "desc" } });
  }

  findStudyCenters(subject: string) {
    return this.db.studyCenter.findMany({ where: { active: true, subjects: { has: subject } }, orderBy: { name: "asc" } });
  }
}
