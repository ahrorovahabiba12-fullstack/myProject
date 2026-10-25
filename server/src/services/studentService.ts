import { StudentRepository } from "../repositories/studentRepository";
import { ParentRepository } from "../repositories/parentRepository";
import { GamificationService } from "./gamificationService";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { MIN_CAREER_GRADE } from "./careerService";
import { Lang } from "../middleware/language";
import { pick } from "../utils/localize";

export class StudentService {
  constructor(
    private repo = new StudentRepository(prisma),
    private gamification = new GamificationService(),
    private parentRepo = new ParentRepository(prisma)
  ) {}

  async getProfile(studentId: string, lang: Lang) {
    const [student, linked] = await Promise.all([this.repo.findById(studentId), this.repo.findLinkedParent(studentId)]);
    if (!student) throw AppError.notFound("Student topilmadi");
    return {
      id: student.id,
      fullName: student.user.fullName,
      grade: student.grade,
      parent: linked?.parent ? { fullName: linked.parent.user.fullName, email: linked.parent.user.email } : null,
      region: student.region,
      interests: student.interests,
      favoriteSubjects: student.favoriteSubjects,
      goals: student.goals,
      careerInterests: student.careerInterests,
      careerModuleVisible: student.grade >= MIN_CAREER_GRADE,
      subjectLevels: student.subjectLevels.map((sl) => ({
        subjectCode: sl.subject.code,
        subjectNameUz: pick(sl.subject.nameUz, sl.subject.nameRu, lang),
        level: sl.level,
        score: sl.score,
      })),
    };
  }

  async updateProfile(
    studentId: string,
    data: Partial<{ interests: string[]; favoriteSubjects: string[]; goals: string[]; careerInterests: string[]; region: string | null }>
  ) {
    return this.repo.updateProfile(studentId, data);
  }

  /**
   * Links (or re-links) this student to the parent account with that email.
   * Student-initiated, same consent model as the optional parentEmail at
   * sign-up — which used to be the ONLY chance: a parent who registered after
   * their child, or a typo at sign-up, left the two permanently unlinked.
   */
  async linkParent(studentId: string, parentEmail: string) {
    const parent = await this.parentRepo.findByEmail(parentEmail);
    if (!parent) throw AppError.notFound("Bu email bilan ota-ona hisobi topilmadi");
    await this.repo.setParent(studentId, parent.id);
    return { parent: { fullName: parent.user.fullName, email: parent.user.email } };
  }

  /** Powers the dashboard header: streak, points, and grade-based feature flags. */
  async getDashboardSummary(studentId: string) {
    const student = await this.repo.findById(studentId);
    if (!student) throw AppError.notFound("Student topilmadi");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [streak, points, achievements, todayQuizzes] = await Promise.all([
      this.gamification.currentStreak(studentId),
      this.gamification.pointsTotal(studentId),
      this.gamification.listAchievements(studentId),
      prisma.quizResult.findMany({ where: { studentId, attemptDate: { gte: today } }, select: { subjectId: true } }),
    ]);
    const todaySubjectCount = new Set(todayQuizzes.map((q) => q.subjectId)).size;

    return {
      fullName: student.user.fullName,
      grade: student.grade,
      streakDays: streak,
      points,
      badgeCount: achievements.length,
      careerModuleVisible: student.grade >= MIN_CAREER_GRADE,
      // Drives the dashboard's "great activity today" callout — real signal,
      // never guessed, so it only shows when genuinely earned.
      todaySubjectCount,
    };
  }
}
