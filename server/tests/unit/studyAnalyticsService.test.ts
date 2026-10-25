import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { StudyAnalyticsService, StudyStats } from "../../src/services/studyAnalyticsService";
import { ScheduleRepository } from "../../src/repositories/scheduleRepository";
import { StudySessionRepository } from "../../src/repositories/studySessionRepository";
import { ConsistencyRepository } from "../../src/repositories/consistencyRepository";
import { SubjectRepository } from "../../src/repositories/subjectRepository";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser, createSubject, startOfDay } from "../helpers/fixtures";

// gamification/consistencyService stay spies — this suite is specifically about
// getStats() DELEGATING to those two services rather than recomputing streak/
// consistency itself; their own real-DB behavior is already covered by
// gamificationService.test.ts and consistencyService.test.ts. Everything else
// (schedule/session/subject/progress reads) is real, against the test DB.
describe("StudyAnalyticsService.getStats (real DB)", () => {
  const gamification = { currentStreak: vi.fn() };
  const consistencyService = { getScore: vi.fn() };

  function makeService() {
    return new StudyAnalyticsService(
      new ScheduleRepository(prisma),
      new StudySessionRepository(prisma),
      new ConsistencyRepository(prisma),
      new SubjectRepository(prisma),
      gamification as any,
      consistencyService as any
    );
  }

  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
    consistencyService.getScore.mockResolvedValue({ score: 42 });
    gamification.currentStreak.mockResolvedValue(3);
  });
  afterAll(() => prisma.$disconnect());

  it("computes plannedTasks/completedTasks/completionRate from Schedule items (task-based)", async () => {
    const { student } = await createStudentUser();
    const math = await createSubject({ code: "MATH" });
    const weekStart = new Date();
    await prisma.schedule.createMany({
      data: [
        { studentId: student.id, weekStart, dayOfWeek: 1, title: "t", subjectId: math.id, minutes: 30, status: "COMPLETED", source: "ai" },
        { studentId: student.id, weekStart, dayOfWeek: 2, title: "t", subjectId: math.id, minutes: 30, status: "COMPLETED", source: "ai" },
        { studentId: student.id, weekStart, dayOfWeek: 3, title: "t", subjectId: math.id, minutes: 30, status: "TODO", source: "ai" },
        { studentId: student.id, weekStart, dayOfWeek: 4, title: "t", subjectId: math.id, minutes: 30, status: "IN_PROGRESS", source: "ai" },
      ],
    });

    const stats = await makeService().getStats(student.id, "uz");

    expect(stats.plannedTasks).toBe(4);
    expect(stats.completedTasks).toBe(2);
    expect(stats.incompleteTasks).toBe(2);
    expect(stats.completionRate).toBe(50);
  });

  it("keeps plannedMinutes (Schedule) and actualMinutes (real StudySession time) separate", async () => {
    const { student } = await createStudentUser();
    const math = await createSubject({ code: "MATH" });
    await prisma.schedule.create({
      data: { studentId: student.id, weekStart: new Date(), dayOfWeek: 1, title: "t", subjectId: math.id, minutes: 60, status: "COMPLETED", source: "ai" },
    });
    await prisma.studySession.create({
      data: { studentId: student.id, subjectId: math.id, startedAt: new Date(), minutes: 35, status: "COMPLETED" },
    });

    const stats = await makeService().getStats(student.id, "uz");

    expect(stats.plannedMinutes).toBe(60);
    expect(stats.actualMinutes).toBe(35);
    expect(stats.actualVsPlannedRate).toBeCloseTo(58.3, 1);
  });

  it("only counts COMPLETED sessions toward actualMinutes/sessionCount/subjectBreakdown, not in-progress ones", async () => {
    const { student } = await createStudentUser();
    const math = await createSubject({ code: "MATH" });
    await prisma.studySession.createMany({
      data: [
        { studentId: student.id, subjectId: math.id, startedAt: new Date(), minutes: 20, status: "COMPLETED" },
        { studentId: student.id, subjectId: math.id, startedAt: new Date(), minutes: 0, status: "IN_PROGRESS" },
      ],
    });

    const stats = await makeService().getStats(student.id, "uz");

    expect(stats.actualMinutes).toBe(20);
    // sessionCount must agree with subjectBreakdown and avgSessionMinutes,
    // which are both completed-only — counting the still-open session here
    // too would make this number not reconcile with either sibling stat.
    expect(stats.sessionCount).toBe(1);
    expect(stats.subjectBreakdown[0].sessionCount).toBe(1);
  });

  it("builds a subject breakdown with localized names, sorted by minutes descending", async () => {
    const { student } = await createStudentUser();
    const math = await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    const eng = await createSubject({ code: "ENGLISH", nameUz: "Ingliz tili", nameRu: "Английский" });
    await prisma.studySession.createMany({
      data: [
        { studentId: student.id, subjectId: eng.id, startedAt: new Date(), minutes: 10, status: "COMPLETED" },
        { studentId: student.id, subjectId: math.id, startedAt: new Date(), minutes: 40, status: "COMPLETED" },
      ],
    });

    const stats = await makeService().getStats(student.id, "uz");

    expect(stats.subjectBreakdown.map((s) => s.subjectName)).toEqual(["Matematika", "Ingliz tili"]);
  });

  it("reuses ConsistencyService/GamificationService rather than recomputing streak or consistency itself", async () => {
    const { student } = await createStudentUser();

    const stats = await makeService().getStats(student.id, "uz");

    expect(consistencyService.getScore).toHaveBeenCalledWith(student.id);
    expect(gamification.currentStreak).toHaveBeenCalledWith(student.id);
    expect(stats.consistencyScore).toBe(42);
    expect(stats.currentStreak).toBe(3);
  });

  it("labels each dailyTrend point with its own LOCAL date and includes real quiz minutes", async () => {
    const { student } = await createStudentUser();
    const math = await createSubject({ code: "MATH" });
    const today = startOfDay();
    await prisma.progress.create({ data: { studentId: student.id, date: today, studyMinutes: 0, completedTasks: 1 } });
    await prisma.studySession.create({
      data: { studentId: student.id, subjectId: math.id, startedAt: new Date(), completedAt: new Date(), minutes: 6, status: "COMPLETED", source: "QUIZ" },
    });

    const stats = await makeService().getStats(student.id, "uz");

    const pad = (n: number) => String(n).padStart(2, "0");
    const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    expect(stats.dailyTrend).toEqual([{ date: todayKey, minutes: 6 }]);
  });
});

describe("StudyAnalyticsService.buildRecommendation (pure, deterministic)", () => {
  const service = new StudyAnalyticsService({} as any, {} as any, {} as any, {} as any, {} as any, {} as any);

  const baseStats: StudyStats = {
    plannedTasks: 10,
    completedTasks: 8,
    incompleteTasks: 2,
    completionRate: 80,
    plannedMinutes: 300,
    actualMinutes: 280,
    actualVsPlannedRate: 93,
    sessionCount: 8,
    avgSessionMinutes: 35,
    consistencyScore: 60,
    currentStreak: 2,
    subjectBreakdown: [],
    dailyTrend: [],
  };

  it("flags a subject with a low average session length among subjects with enough data (drop-off signal)", () => {
    const stats: StudyStats = {
      ...baseStats,
      subjectBreakdown: [
        { subjectId: "eng", subjectName: "Ingliz tili", sessionCount: 3, minutes: 15 }, // avg 5 min/session
        { subjectId: "math", subjectName: "Matematika", sessionCount: 3, minutes: 120 },
      ],
    };

    const text = service.buildRecommendation(stats, "uz");

    expect(text).toContain("Ingliz tili");
  });

  it("does NOT flag a subject with only one data point (avoids a false signal from one skipped task)", () => {
    const stats: StudyStats = {
      ...baseStats,
      subjectBreakdown: [{ subjectId: "eng", subjectName: "Ingliz tili", sessionCount: 1, minutes: 2 }],
    };

    const text = service.buildRecommendation(stats, "uz");

    expect(text).not.toContain("Ingliz tili");
  });

  it("flags a low actual-vs-planned rate when no specific subject stands out", () => {
    const stats: StudyStats = { ...baseStats, subjectBreakdown: [], actualVsPlannedRate: 30 };

    const text = service.buildRecommendation(stats, "uz");

    expect(text).toContain("30%");
  });

  it("gives positive reinforcement for a 7+ day streak when nothing else needs flagging", () => {
    const stats: StudyStats = { ...baseStats, subjectBreakdown: [], actualVsPlannedRate: 90, currentStreak: 9 };

    const text = service.buildRecommendation(stats, "uz");

    expect(text).toContain("9");
  });

  it("respects the lang parameter (Russian output)", () => {
    const stats: StudyStats = { ...baseStats, subjectBreakdown: [], actualVsPlannedRate: 90, currentStreak: 9 };

    const text = service.buildRecommendation(stats, "ru");

    expect(text).toContain("дней подряд");
  });
});
