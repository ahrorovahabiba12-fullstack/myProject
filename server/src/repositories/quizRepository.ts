import { PrismaClient, SubjectLevelEnum } from "@prisma/client";

export class QuizRepository {
  constructor(private db: PrismaClient) {}

  findSubjectsWithTopics() {
    return this.db.subject.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { topics: { select: { grade: true } } },
    });
  }

  findSubjectByCode(code: string) {
    return this.db.subject.findFirst({ where: { code, active: true } });
  }

  findTopics(subjectId: string, grade: number) {
    return this.db.topic.findMany({
      where: { subjectId, grade },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { questions: true } } },
    });
  }

  findTopic(id: string) {
    return this.db.topic.findUnique({ where: { id }, include: { subject: true } });
  }

  /** Every question of one topic — selection/weighting happens in QuizService. */
  findTopicQuestionPool(topicId: string) {
    return this.db.question.findMany({ where: { topicId } });
  }

  /**
   * Most recent attempt per question first (ordered desc) — the caller keeps
   * only the first occurrence per questionId to get each question's latest
   * correct/wrong outcome for this student.
   */
  findRecentAttempts(studentId: string, questionIds: string[]) {
    return this.db.questionAttempt.findMany({
      where: { studentId, questionId: { in: questionIds } },
      orderBy: { attemptedAt: "desc" },
      select: { questionId: true, correct: true },
    });
  }

  findQuestionsByIds(ids: string[]) {
    return this.db.question.findMany({ where: { id: { in: ids } } });
  }

  saveResult(data: {
    studentId: string;
    subjectId: string;
    grade: number;
    score: number;
    level: SubjectLevelEnum;
    attemptDate: Date;
  }) {
    return this.db.quizResult.create({ data });
  }

  upsertSubjectLevel(studentId: string, subjectId: string, level: SubjectLevelEnum, score: number) {
    return this.db.subjectLevel.upsert({
      where: { studentId_subjectId: { studentId, subjectId } },
      create: { studentId, subjectId, level, score, source: "quiz" },
      update: { level, score, source: "quiz" },
    });
  }
}
