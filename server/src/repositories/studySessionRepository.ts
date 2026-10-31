import { PrismaClient, StudySessionSource } from "@prisma/client";

export class StudySessionRepository {
  constructor(private db: PrismaClient) {}

  /**
   * Records an already-finished session directly — e.g. a submitted quiz,
   * whose real start-to-submit duration is already known.
   */
  createCompleted(
    studentId: string,
    scheduleId: string | null,
    subjectId: string | null,
    startedAt: Date,
    completedAt: Date,
    minutes: number,
    seconds: number,
    source: StudySessionSource
  ) {
    return this.db.studySession.create({
      data: { studentId, scheduleId, subjectId, startedAt, completedAt, minutes, seconds, status: "COMPLETED", source },
    });
  }

  findRecent(studentId: string, since: Date) {
    return this.db.studySession.findMany({
      where: { studentId, startedAt: { gte: since } },
      orderBy: { startedAt: "asc" },
    });
  }

  /**
   * Real elapsed time for quiz-triggered sessions only — the counterpart to
   * Progress.studyMinutes, which is deliberately 0 for these (see quizService).
   * Callers add this on top of Progress.studyMinutes to get true daily activity
   * without double-counting SCHEDULE-sourced sessions (already credited there).
   */
  findCompletedQuizSessions(studentId: string, since: Date) {
    return this.db.studySession.findMany({
      where: { studentId, status: "COMPLETED", source: "QUIZ", completedAt: { gte: since } },
      select: { completedAt: true, minutes: true },
    });
  }
}
