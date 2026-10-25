import { PrismaClient, ScheduleStatus } from "@prisma/client";

export class ScheduleRepository {
  constructor(private db: PrismaClient) {}

  findByWeek(studentId: string, weekStart: Date) {
    return this.db.schedule.findMany({
      where: { studentId, weekStart },
      include: { subject: true, studySessions: true },
      orderBy: { dayOfWeek: "asc" },
    });
  }

  createMany(
    studentId: string,
    weekStart: Date,
    items: { dayOfWeek: number; title: string; titleRu: string; subjectCode?: string; minutes: number }[],
    subjectIdByCode: Map<string, string>
  ) {
    return this.db.schedule.createMany({
      data: items.map((i) => ({
        studentId,
        weekStart,
        dayOfWeek: i.dayOfWeek,
        title: i.title,
        titleRu: i.titleRu,
        subjectId: i.subjectCode ? subjectIdByCode.get(i.subjectCode) : undefined,
        minutes: i.minutes,
        status: ScheduleStatus.TODO,
        source: "ai",
      })),
    });
  }

  findOne(id: string, studentId: string) {
    return this.db.schedule.findFirst({ where: { id, studentId } });
  }

  // Compare-and-set: only moves the item if it is still in `from` — the
  // returned count is 0 when a concurrent request already changed it.
  updateStatusIfCurrent(id: string, studentId: string, from: ScheduleStatus, to: ScheduleStatus) {
    return this.db.schedule.updateMany({ where: { id, studentId, status: from }, data: { status: to } });
  }

  updateStatus(id: string, studentId: string, status: ScheduleStatus, lastScore?: number) {
    // studentId filter enforces ownership at the query level, not just in the controller.
    return this.db.schedule.updateMany({
      where: { id, studentId },
      data: lastScore === undefined ? { status } : { status, lastScore },
    });
  }

  /**
   * Inserts a single COMPLETED item for today, for a subject the day's plan didn't
   * already include — used when a quiz is taken for a subject outside today's Schedule,
   * so that real activity is still reflected instead of silently going unrecorded.
   */
  createCompletedNow(
    studentId: string,
    weekStart: Date,
    dayOfWeek: number,
    subjectId: string,
    title: string,
    titleRu: string,
    minutes: number,
    lastScore: number
  ) {
    return this.db.schedule.create({
      data: {
        studentId,
        weekStart,
        dayOfWeek,
        title,
        titleRu,
        subjectId,
        minutes,
        status: ScheduleStatus.COMPLETED,
        source: "quiz",
        lastScore,
      },
    });
  }

  // Only TODO items are safe to clear before writing a freshly-generated
  // plan — an item the student has already started (IN_PROGRESS) or
  // finished (COMPLETED) carries real progress, and StudySession rows
  // cascade-delete with their Schedule row, so wiping it here would erase
  // genuine history, not just a stale plan.
  deleteTodoItems(studentId: string, weekStart: Date) {
    return this.db.schedule.deleteMany({ where: { studentId, weekStart, status: ScheduleStatus.TODO } });
  }

  findRecent(studentId: string, since: Date) {
    return this.db.schedule.findMany({ where: { studentId, weekStart: { gte: since } } });
  }

  // Items from an earlier day this week that never got finished — the day
  // they were scheduled for is already gone, so leaving them TODO/IN_PROGRESS
  // would be misleading forever (the Play button only ever appears on
  // today's card, so an IN_PROGRESS one from a past day could otherwise
  // never be reached again).
  findPastDueOpenItems(studentId: string, weekStart: Date, beforeIsoDay: number) {
    return this.db.schedule.findMany({
      where: { studentId, weekStart, dayOfWeek: { lt: beforeIsoDay }, status: { in: [ScheduleStatus.TODO, ScheduleStatus.IN_PROGRESS] } },
      select: { id: true, status: true },
    });
  }

  skipItems(ids: string[]) {
    return this.db.schedule.updateMany({ where: { id: { in: ids } }, data: { status: ScheduleStatus.SKIPPED } });
  }
}
