import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { ScheduleService } from "../../src/services/scheduleService";
import { ScheduleRepository } from "../../src/repositories/scheduleRepository";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser, createSubject, startOfDay } from "../helpers/fixtures";

// Same convention the service itself uses (Monday=1..Sunday=7) so fixtures
// line up with "today" regardless of which real weekday the suite runs on.
function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
const weekStart = mondayOf(new Date());
const jsDay = new Date().getDay();
const todayIso = jsDay === 0 ? 7 : jsDay;

describe("ScheduleService — markStatus (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  describe("Progress crediting (unchanged behavior)", () => {
    it("credits Progress with the task's real minutes when a task newly becomes COMPLETED", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "IN_PROGRESS", source: "ai" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "COMPLETED");

      const updated = await prisma.schedule.findUnique({ where: { id: schedule.id } });
      expect(updated?.status).toBe("COMPLETED");
      const progress = await prisma.progress.findUnique({ where: { studentId_date: { studentId: student.id, date: startOfDay() } } });
      expect(progress).toMatchObject({ studyMinutes: 45, completedTasks: 1 });
    });

    it("does NOT credit Progress when moving between two non-COMPLETED statuses", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "TODO", source: "ai" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "IN_PROGRESS");

      const progress = await prisma.progress.findUnique({ where: { studentId_date: { studentId: student.id, date: startOfDay() } } });
      expect(progress).toBeNull();
    });

    it("reverses the credit (undo) when a COMPLETED task is moved back to another status", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "COMPLETED", source: "ai" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "TODO");

      const progress = await prisma.progress.findUnique({ where: { studentId_date: { studentId: student.id, date: startOfDay() } } });
      expect(progress).toMatchObject({ studyMinutes: -45, completedTasks: -1 });
    });

    it("reverses a quiz-driven completion (lastScore set) by undoing its actual score credit, never the never-credited minutes", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      // Mirrors what autoTransitionForSubject leaves behind: COMPLETED with a
      // lastScore, but no minutes were ever credited for it (the quiz's own
      // transaction credited completedTasks + score directly, not through here).
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "COMPLETED", lastScore: 80, source: "ai" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "TODO");

      const progress = await prisma.progress.findUnique({ where: { studentId_date: { studentId: student.id, date: startOfDay() } } });
      // Undoes the score credit (-80) and the task count (-1), but studyMinutes
      // stays untouched (0) — the 45 planned minutes were never added, so
      // subtracting them here would have driven studyMinutes negative.
      expect(progress).toMatchObject({ studyMinutes: 0, completedTasks: -1, scoreDelta: -80 });
    });

    it("is a no-op (no DB write, no crediting) when the status doesn't actually change", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "COMPLETED", source: "ai" },
      });

      const result = await new ScheduleService().markStatus(student.id, schedule.id, "COMPLETED");

      expect(result).toEqual({ success: true });
      const progress = await prisma.progress.findUnique({ where: { studentId_date: { studentId: student.id, date: startOfDay() } } });
      expect(progress).toBeNull();
    });

    it("rejects when the schedule item doesn't belong to this student (ownership)", async () => {
      const { student: owner } = await createStudentUser();
      const { student: attacker } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: owner.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "TODO", source: "ai" },
      });

      await expect(new ScheduleService().markStatus(attacker.id, schedule.id, "COMPLETED")).rejects.toMatchObject({ statusCode: 404 });
    });

    it("credits Progress only once when the same transition arrives twice concurrently (read-then-write race)", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "TODO", source: "ai" },
      });
      // Force the worst-case interleaving deterministically: both requests have
      // read the item (still TODO) before either one writes.
      const repo = new ScheduleRepository(prisma);
      const realFindOne = repo.findOne.bind(repo);
      let reads = 0;
      let releaseReads!: () => void;
      const bothRead = new Promise<void>((resolve) => (releaseReads = resolve));
      repo.findOne = (async (id: string, studentId: string) => {
        const row = await realFindOne(id, studentId);
        if (++reads === 2) releaseReads();
        await bothRead;
        return row;
      }) as typeof repo.findOne;
      const service = new ScheduleService(undefined, repo);

      await Promise.all([
        service.markStatus(student.id, schedule.id, "COMPLETED"),
        service.markStatus(student.id, schedule.id, "COMPLETED"),
      ]);

      const progress = await prisma.progress.findUnique({ where: { studentId_date: { studentId: student.id, date: startOfDay() } } });
      expect(progress).toMatchObject({ studyMinutes: 45, completedTasks: 1 });
    });
  });

  describe("getCurrentWeek — actualMinutes reflects real spent time, not the plan", () => {
    it("reports the real elapsed StudySession minutes for a completed task, not the planned Schedule.minutes", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "IN_PROGRESS", source: "ai" },
      });
      const startedAt = new Date(Date.now() - 12 * 60 * 1000); // 12 real minutes elapsed
      await prisma.studySession.create({
        data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt, minutes: 0, status: "IN_PROGRESS" },
      });

      const service = new ScheduleService();
      await service.markStatus(student.id, schedule.id, "COMPLETED");
      const week = await service.getCurrentWeek(student.id, "uz");

      const item = week.find((i) => i.id === schedule.id)!;
      expect(item.minutes).toBe(45); // the plan is unchanged
      expect(item.actualMinutes).toBeGreaterThanOrEqual(11);
      expect(item.actualMinutes).toBeLessThanOrEqual(13);
    });

    it("reports 0 actual minutes for a task with no completed StudySession yet", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "TODO", source: "ai" },
      });

      const week = await new ScheduleService().getCurrentWeek(student.id, "uz");

      expect(week[0].actualMinutes).toBe(0);
    });

    it("keeps full second-level precision in actualSeconds for a sub-minute completion, instead of rounding it away", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 20, status: "IN_PROGRESS", source: "ai" },
      });
      const startedAt = new Date(Date.now() - 20 * 1000); // 20 real seconds elapsed — rounds to "0 daqiqa"
      await prisma.studySession.create({
        data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt, minutes: 0, status: "IN_PROGRESS" },
      });

      const service = new ScheduleService();
      await service.markStatus(student.id, schedule.id, "COMPLETED");
      const week = await service.getCurrentWeek(student.id, "uz");

      const item = week.find((i) => i.id === schedule.id)!;
      expect(item.actualMinutes).toBe(0); // still rounds to 0 minutes...
      expect(item.actualSeconds).toBeGreaterThanOrEqual(19); // ...but the real ~20s is preserved
      expect(item.actualSeconds).toBeLessThanOrEqual(22);
    });
  });

  describe("StudySession lifecycle", () => {
    it("starts a new StudySession when a task enters IN_PROGRESS", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "TODO", source: "ai" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "IN_PROGRESS");

      const sessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({ studentId: student.id, subjectId: subject.id, status: "IN_PROGRESS" });
    });

    it("does NOT start a duplicate StudySession if one is already active for this task", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "TODO", source: "ai" },
      });
      await prisma.studySession.create({
        data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt: new Date(), minutes: 0, status: "IN_PROGRESS" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "IN_PROGRESS");

      const sessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
      expect(sessions).toHaveLength(1);
    });

    it("completes the active StudySession (with real elapsed minutes) when the task becomes COMPLETED", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "IN_PROGRESS", source: "ai" },
      });
      const startedAt = new Date(Date.now() - 12 * 60 * 1000); // started 12 minutes ago
      const session = await prisma.studySession.create({
        data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt, minutes: 0, status: "IN_PROGRESS" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "COMPLETED");

      const updated = await prisma.studySession.findUnique({ where: { id: session.id } });
      expect(updated?.status).toBe("COMPLETED");
      expect(updated?.completedAt).not.toBeNull();
      expect(updated?.minutes).toBeGreaterThanOrEqual(11);
      expect(updated?.minutes).toBeLessThanOrEqual(13);
    });

    it("skips StudySession completion gracefully if no active session exists (e.g. jumped straight to COMPLETED)", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "TODO", source: "ai" },
      });

      await expect(new ScheduleService().markStatus(student.id, schedule.id, "COMPLETED")).resolves.toEqual({ success: true });
      const sessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
      expect(sessions).toHaveLength(0);
    });

    it("leaves a completed StudySession untouched on undo (history is preserved, not deleted or mutated)", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "COMPLETED", source: "ai" },
      });
      const completedAt = new Date();
      const session = await prisma.studySession.create({
        data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt: new Date(Date.now() - 60000), completedAt, minutes: 1, status: "COMPLETED" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "TODO");

      const unchanged = await prisma.studySession.findUnique({ where: { id: session.id } });
      expect(unchanged).toMatchObject({ status: "COMPLETED", minutes: 1 });
      const allSessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
      expect(allSessions).toHaveLength(1); // no new session started either
    });

    it("Progress crediting still uses the Schedule item's planned minutes, not the StudySession's real elapsed minutes", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "IN_PROGRESS", source: "ai" }, // planned: 45
      });
      const startedAt = new Date(Date.now() - 90 * 60 * 1000); // 90 real minutes elapsed
      await prisma.studySession.create({
        data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt, minutes: 0, status: "IN_PROGRESS" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "COMPLETED");

      // Progress gets the planned 45, never the real ~90 elapsed minutes — Progress logic is unchanged.
      const progress = await prisma.progress.findUnique({ where: { studentId_date: { studentId: student.id, date: startOfDay() } } });
      expect(progress).toMatchObject({ studyMinutes: 45, completedTasks: 1 });
    });
  });
});

describe("ScheduleService.autoTransitionForSubject (quiz-driven auto completion, real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("moves a TODO item for the given subject/day to IN_PROGRESS and starts a StudySession", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject({ code: "MATH" });
    const schedule = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "TODO", source: "ai" },
    });

    await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "IN_PROGRESS");

    const updated = await prisma.schedule.findUnique({ where: { id: schedule.id } });
    expect(updated?.status).toBe("IN_PROGRESS");
    const sessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
    expect(sessions).toHaveLength(1);
  });

  it("ignores items for other subjects or other days", async () => {
    const { student } = await createStudentUser();
    const math = await createSubject({ code: "MATH" });
    const english = await createSubject({ code: "ENGLISH" });
    const wrongSubject = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: english.id, minutes: 30, status: "TODO", source: "ai" },
    });
    const wrongDay = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso === 1 ? 2 : 1, title: "t", subjectId: math.id, minutes: 30, status: "TODO", source: "ai" },
    });

    await new ScheduleService().autoTransitionForSubject(student.id, math.id, "IN_PROGRESS");

    expect((await prisma.schedule.findUnique({ where: { id: wrongSubject.id } }))?.status).toBe("TODO");
    expect((await prisma.schedule.findUnique({ where: { id: wrongDay.id } }))?.status).toBe("TODO");
  });

  it("does not touch an item that's already IN_PROGRESS or COMPLETED when targeting IN_PROGRESS", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject({ code: "MATH" });
    const inProgress = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "IN_PROGRESS", source: "ai" },
    });
    const completed = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "COMPLETED", source: "ai" },
    });

    await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "IN_PROGRESS");

    expect((await prisma.schedule.findUnique({ where: { id: inProgress.id } }))?.status).toBe("IN_PROGRESS");
    expect((await prisma.schedule.findUnique({ where: { id: completed.id } }))?.status).toBe("COMPLETED");
  });

  it("completes an IN_PROGRESS item and closes its StudySession, WITHOUT crediting Progress (caller already did)", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject({ code: "MATH" });
    const schedule = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "IN_PROGRESS", source: "ai" },
    });
    const startedAt = new Date(Date.now() - 10 * 60 * 1000);
    const session = await prisma.studySession.create({
      data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt, minutes: 0, status: "IN_PROGRESS" },
    });

    await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED", 80);

    const updatedSchedule = await prisma.schedule.findUnique({ where: { id: schedule.id } });
    expect(updatedSchedule).toMatchObject({ status: "COMPLETED", lastScore: 80 });
    const updatedSession = await prisma.studySession.findUnique({ where: { id: session.id } });
    expect(updatedSession?.status).toBe("COMPLETED");
    const progress = await prisma.progress.findUnique({ where: { studentId_date: { studentId: student.id, date: startOfDay() } } });
    expect(progress).toBeNull();
  });

  it("also completes a still-TODO item directly (quiz submitted without ever pressing Boshlash)", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject({ code: "MATH" });
    const schedule = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "TODO", source: "ai" },
    });

    await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED", 75);

    const updated = await prisma.schedule.findUnique({ where: { id: schedule.id } });
    expect(updated).toMatchObject({ status: "COMPLETED", lastScore: 75 });
    const sessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
    expect(sessions).toHaveLength(0); // no elapsedSeconds supplied and nothing to close — that's fine
  });

  it("records a StudySession with the quiz-supplied duration for a still-TODO item, even though it was never started", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject({ code: "MATH" });
    const schedule = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "TODO", source: "ai" },
    });

    await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED", 75, 37);

    const sessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ status: "COMPLETED", seconds: 37, minutes: 1 });
  });

  it("prefers the quiz-supplied duration over inferring elapsed time from an existing StudySession", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject({ code: "MATH" });
    const schedule = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "IN_PROGRESS", source: "ai" },
    });
    const startedAt = new Date(Date.now() - 10 * 60 * 1000); // 10 real minutes, per StudySession bookkeeping
    await prisma.studySession.create({
      data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt, minutes: 0, status: "IN_PROGRESS" },
    });

    // Quiz itself reports only 22 real seconds elapsed (start-to-submit) — this
    // should win over the 10-minute StudySession.startedAt inference.
    await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED", 80, 22);

    const sessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ status: "COMPLETED", seconds: 22, minutes: 0 });
  });

  it("is a no-op for an already-COMPLETED item", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject({ code: "MATH" });
    const schedule = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "COMPLETED", lastScore: 60, source: "ai" },
    });

    await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED");

    const unchanged = await prisma.schedule.findUnique({ where: { id: schedule.id } });
    expect(unchanged?.lastScore).toBe(60); // untouched, not overwritten with undefined/null
  });

  describe("subject not on today's plan at all", () => {
    it("inserts a new COMPLETED item for today when a score is provided and nothing matched", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject({ code: "SCIENCE", nameUz: "Tabiatshunoslik", nameRu: "Естествознание" });

      await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED", 90);

      const created = await prisma.schedule.findMany({ where: { studentId: student.id, subjectId: subject.id } });
      expect(created).toHaveLength(1);
      expect(created[0]).toMatchObject({ weekStart, dayOfWeek: todayIso, status: "COMPLETED", lastScore: 90 });
      expect(created[0].title).toContain("Tabiatshunoslik");
    });

    it("also records a StudySession with the quiz-supplied duration for the newly-inserted item — this was the original bug (item created COMPLETED with no timing at all)", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject({ code: "SCIENCE" });

      await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED", 90, 14);

      const created = await prisma.schedule.findFirst({ where: { studentId: student.id, subjectId: subject.id } });
      const sessions = await prisma.studySession.findMany({ where: { scheduleId: created!.id } });
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({ status: "COMPLETED", seconds: 14, minutes: 0 });
    });

    it("stores both language variants of the new item's title, not just the caller's current UI language", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject({ code: "SCIENCE", nameUz: "Tabiatshunoslik", nameRu: "Естествознание" });

      await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED", 90);

      const created = await prisma.schedule.findMany({ where: { studentId: student.id, subjectId: subject.id } });
      expect(created[0].title).toContain("Tabiatshunoslik");
      expect(created[0].titleRu).toContain("Естествознание");
    });

    it("does NOT insert a new item when targeting IN_PROGRESS (only a real, scored completion adds one)", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject({ code: "SCIENCE" });

      await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "IN_PROGRESS");

      const created = await prisma.schedule.findMany({ where: { studentId: student.id, subjectId: subject.id } });
      expect(created).toHaveLength(0);
    });

    it("does NOT insert a new item when no score is provided at all", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject({ code: "SCIENCE" });

      await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED");

      const created = await prisma.schedule.findMany({ where: { studentId: student.id, subjectId: subject.id } });
      expect(created).toHaveLength(0);
    });

    it("does nothing if the subject itself can't be found (defensive — never crashes the caller)", async () => {
      const { student } = await createStudentUser();

      await expect(new ScheduleService().autoTransitionForSubject(student.id, "ghost-subject-id", "COMPLETED", 50)).resolves.toBeUndefined();
      const created = await prisma.schedule.findMany({ where: { studentId: student.id } });
      expect(created).toHaveLength(0);
    });
  });
});

describe("ScheduleService — generateWeek neutral-subject computation (real DB)", () => {
  const ai = { generateLearningPlan: vi.fn() };
  // Pinned to a Monday: generation only plans today-onward, so on a real
  // Sunday nothing would be planned (and the AI never called) at all.
  const monday = new Date("2026-09-28T10:00:00");
  const thisWeekStart = mondayOf(monday);

  function makeService() {
    return new ScheduleService(ai as any);
  }

  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
    ai.generateLearningPlan.mockResolvedValue({ days: [] });
    vi.useFakeTimers();
    vi.setSystemTime(monday);
  });
  afterEach(() => vi.useRealTimers());
  afterAll(() => prisma.$disconnect());

  it("passes every catalog subject the student hasn't tested yet as neutralSubjects", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const math = await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    await createSubject({ code: "ENGLISH", nameUz: "Ingliz tili", nameRu: "Английский" });
    await createSubject({ code: "HISTORY", nameUz: "Tarix", nameRu: "История" });
    await prisma.subjectLevel.create({ data: { studentId: student.id, subjectId: math.id, level: "WEAK", score: 30, source: "test" } });

    await makeService().generateWeek(student.id, "uz");

    expect(ai.generateLearningPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        weakSubjects: [{ code: "MATH", nameUz: "Matematika", nameRu: "Математика" }],
        neutralSubjects: expect.arrayContaining([
          { code: "ENGLISH", nameUz: "Ingliz tili", nameRu: "Английский" },
          { code: "HISTORY", nameUz: "Tarix", nameRu: "История" },
        ]),
      })
    );
    expect(ai.generateLearningPlan.mock.calls[0][0].neutralSubjects).toHaveLength(2);
  });

  it("excludes already-tested subjects (weak or strong) from the neutral list", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const math = await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    const english = await createSubject({ code: "ENGLISH", nameUz: "Ingliz tili", nameRu: "Английский" });
    await createSubject({ code: "HISTORY", nameUz: "Tarix", nameRu: "История" });
    await prisma.subjectLevel.createMany({
      data: [
        { studentId: student.id, subjectId: math.id, level: "WEAK", score: 30, source: "test" },
        { studentId: student.id, subjectId: english.id, level: "STRONG", score: 90, source: "test" },
      ],
    });

    await makeService().generateWeek(student.id, "uz");

    const call = ai.generateLearningPlan.mock.calls[0][0];
    expect(call.neutralSubjects).toEqual([{ code: "HISTORY", nameUz: "Tarix", nameRu: "История" }]);
  });

  it("passes MEDIUM-level subjects to the planner instead of silently dropping them", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const math = await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    const english = await createSubject({ code: "ENGLISH", nameUz: "Ingliz tili", nameRu: "Английский" });
    await prisma.subjectLevel.createMany({
      data: [
        { studentId: student.id, subjectId: math.id, level: "MEDIUM", score: 60, source: "test" },
        { studentId: student.id, subjectId: english.id, level: "MEDIUM", score: 70, source: "test" },
      ],
    });

    await makeService().generateWeek(student.id, "uz");

    const call = ai.generateLearningPlan.mock.calls[0][0];
    expect(call.mediumSubjects).toEqual(
      expect.arrayContaining([
        { code: "MATH", nameUz: "Matematika", nameRu: "Математика" },
        { code: "ENGLISH", nameUz: "Ingliz tili", nameRu: "Английский" },
      ])
    );
    expect(call.mediumSubjects).toHaveLength(2);
    expect(call.neutralSubjects).toEqual([]);
  });

  it("clamps AI-proposed minutes to a whole, sane number before saving — a fractional value used to crash the insert with a 500", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    await createSubject({ code: "MATH" });
    ai.generateLearningPlan.mockResolvedValue({
      days: [
        { dayOfWeek: 1, subjectCode: "MATH", minutes: 12.5, title: "a", titleRu: "a" },
        { dayOfWeek: 2, subjectCode: "MATH", minutes: -3, title: "b", titleRu: "b" },
        { dayOfWeek: 3, subjectCode: "MATH", minutes: 500, title: "c", titleRu: "c" },
      ],
    });

    const week = await makeService().generateWeek(student.id, "uz");

    expect(week.map((i) => [i.dayOfWeek, i.minutes])).toEqual([
      [1, 13],
      [2, 1],
      [3, 90],
    ]);
  });

  it("regenerate never deletes a COMPLETED or IN_PROGRESS item (and its StudySession history) — only TODO items are replaced", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const subject = await createSubject({ code: "MATH" });
    const weekStart = thisWeekStart;

    const completed = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: 1, title: "old completed", subjectId: subject.id, minutes: 30, status: "COMPLETED", source: "ai" },
    });
    const inProgress = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: 2, title: "old in progress", subjectId: subject.id, minutes: 30, status: "IN_PROGRESS", source: "ai" },
    });
    const session = await prisma.studySession.create({
      data: { studentId: student.id, scheduleId: completed.id, subjectId: subject.id, startedAt: new Date(), completedAt: new Date(), minutes: 20, seconds: 1200, status: "COMPLETED" },
    });
    const todo = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: 3, title: "old todo", subjectId: subject.id, minutes: 30, status: "TODO", source: "ai" },
    });

    ai.generateLearningPlan.mockResolvedValue({
      days: [{ dayOfWeek: 4, subjectCode: "MATH", minutes: 20, title: "fresh plan", titleRu: "новый план" }],
    });

    await makeService().generateWeek(student.id, "uz");

    // Untouched: real progress and its StudySession history survive regeneration.
    expect(await prisma.schedule.findUnique({ where: { id: completed.id } })).toMatchObject({ status: "COMPLETED" });
    expect(await prisma.schedule.findUnique({ where: { id: inProgress.id } })).toMatchObject({ status: "IN_PROGRESS" });
    expect(await prisma.studySession.findUnique({ where: { id: session.id } })).not.toBeNull();

    // Replaced: the never-started item is gone, and the fresh plan is in.
    expect(await prisma.schedule.findUnique({ where: { id: todo.id } })).toBeNull();
    const fresh = await prisma.schedule.findFirst({ where: { studentId: student.id, dayOfWeek: 4 } });
    expect(fresh).toMatchObject({ title: "fresh plan", status: "TODO" });
  });
});

describe("ScheduleService — never plans days that are already gone (real DB)", () => {
  const ai = { generateLearningPlan: vi.fn() };
  const fullWeek = {
    days: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, subjectCode: "MATH", minutes: 10, title: "mashq", titleRu: "практика" })),
  };
  const thursday = new Date("2026-10-01T10:00:00");
  const sunday = new Date("2026-10-04T10:00:00");

  function makeService() {
    return new ScheduleService(ai as any);
  }

  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
    ai.generateLearningPlan.mockResolvedValue(fullWeek);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());
  afterAll(() => prisma.$disconnect());

  it("a student whose first week starts on a Thursday gets Thu-Sat only — nothing that instantly turns SKIPPED (the reported bug)", async () => {
    vi.setSystemTime(thursday);
    const { student } = await createStudentUser({ grade: 8 });
    await createSubject({ code: "MATH" });

    await makeService().getCurrentWeek(student.id, "uz");
    const secondLoad = await makeService().getCurrentWeek(student.id, "uz");

    expect(secondLoad.map((i) => i.dayOfWeek)).toEqual([4, 5, 6]);
    expect(secondLoad.every((i) => i.status === "TODO")).toBe(true);
  });

  it("regenerating mid-week records a past day's unfinished item as SKIPPED once, and adds nothing new to past days", async () => {
    vi.setSystemTime(thursday);
    const { student } = await createStudentUser({ grade: 8 });
    const subject = await createSubject({ code: "MATH" });
    const missedMonday = await prisma.schedule.create({
      data: { studentId: student.id, weekStart: mondayOf(thursday), dayOfWeek: 1, title: "t", subjectId: subject.id, minutes: 10, status: "TODO", source: "ai" },
    });

    await makeService().generateWeek(student.id, "uz");
    await makeService().generateWeek(student.id, "uz");

    // Kept as real history (missed), not deleted as if never planned...
    expect((await prisma.schedule.findUnique({ where: { id: missedMonday.id } }))?.status).toBe("SKIPPED");
    // ...and repeated regenerating never piles extra SKIPPED rows onto Mon-Wed.
    const pastDayItems = await prisma.schedule.count({ where: { studentId: student.id, dayOfWeek: { lt: 4 } } });
    expect(pastDayItems).toBe(1);
    const upcoming = await prisma.schedule.findMany({ where: { studentId: student.id, dayOfWeek: { gte: 4 } } });
    expect(upcoming.map((i) => i.dayOfWeek).sort()).toEqual([4, 5, 6]);
  });

  it("on Sunday (rest day, every planned day already past) creates nothing and never calls the AI", async () => {
    vi.setSystemTime(sunday);
    const { student } = await createStudentUser({ grade: 8 });

    const week = await makeService().getCurrentWeek(student.id, "uz");

    expect(week).toEqual([]);
    expect(ai.generateLearningPlan).not.toHaveBeenCalled();
  });
});

describe("ScheduleService.getCurrentWeek — auto-skipping past-due items (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("skips a TODO/IN_PROGRESS item left over from an earlier day this week, closes its dangling StudySession, and leaves today's own items untouched", async () => {
    // A fixed, known Thursday — fake timers make this deterministic regardless
    // of which real day the suite happens to run on (Monday/Tuesday only
    // count as "past" relative to a specific "today").
    const thursday = new Date("2026-10-01T10:00:00");
    vi.useFakeTimers();
    vi.setSystemTime(thursday);
    try {
      const { student } = await createStudentUser({ grade: 8 });
      const subject = await createSubject();
      const thisWeekStart = mondayOf(thursday);

      const stuckTodo = await prisma.schedule.create({
        data: { studentId: student.id, weekStart: thisWeekStart, dayOfWeek: 1, title: "t", subjectId: subject.id, minutes: 30, status: "TODO", source: "ai" },
      });
      const stuckInProgress = await prisma.schedule.create({
        data: { studentId: student.id, weekStart: thisWeekStart, dayOfWeek: 2, title: "t", subjectId: subject.id, minutes: 30, status: "IN_PROGRESS", source: "ai" },
      });
      const danglingSession = await prisma.studySession.create({
        data: { studentId: student.id, scheduleId: stuckInProgress.id, subjectId: subject.id, startedAt: thursday, minutes: 0, status: "IN_PROGRESS" },
      });
      const todayItem = await prisma.schedule.create({
        data: { studentId: student.id, weekStart: thisWeekStart, dayOfWeek: 4, title: "t", subjectId: subject.id, minutes: 30, status: "TODO", source: "ai" },
      });

      await new ScheduleService().getCurrentWeek(student.id, "uz");

      expect((await prisma.schedule.findUnique({ where: { id: stuckTodo.id } }))?.status).toBe("SKIPPED");
      expect((await prisma.schedule.findUnique({ where: { id: stuckInProgress.id } }))?.status).toBe("SKIPPED");
      expect((await prisma.studySession.findUnique({ where: { id: danglingSession.id } }))?.status).toBe("SKIPPED");
      // Today's own TODO item is a day-of-week match for "today", not "past due" — untouched.
      expect((await prisma.schedule.findUnique({ where: { id: todayItem.id } }))?.status).toBe("TODO");
    } finally {
      vi.useRealTimers();
    }
  });

  it("never skips a COMPLETED past item — only TODO/IN_PROGRESS are stale-by-day", async () => {
    const thursday = new Date("2026-10-01T10:00:00");
    vi.useFakeTimers();
    vi.setSystemTime(thursday);
    try {
      const { student } = await createStudentUser({ grade: 8 });
      const subject = await createSubject();
      const thisWeekStart = mondayOf(thursday);

      const completedMonday = await prisma.schedule.create({
        data: { studentId: student.id, weekStart: thisWeekStart, dayOfWeek: 1, title: "t", subjectId: subject.id, minutes: 30, status: "COMPLETED", source: "ai" },
      });

      await new ScheduleService().getCurrentWeek(student.id, "uz");

      expect((await prisma.schedule.findUnique({ where: { id: completedMonday.id } }))?.status).toBe("COMPLETED");
    } finally {
      vi.useRealTimers();
    }
  });
});
