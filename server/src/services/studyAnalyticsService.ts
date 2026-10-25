import { ScheduleRepository } from "../repositories/scheduleRepository";
import { StudySessionRepository } from "../repositories/studySessionRepository";
import { ConsistencyRepository } from "../repositories/consistencyRepository";
import { SubjectRepository } from "../repositories/subjectRepository";
import { GamificationService } from "./gamificationService";
import { ConsistencyService } from "./consistencyService";
import { prisma } from "../config/prisma";
import { Lang } from "../middleware/language";
import { pick } from "../utils/localize";

const PERIOD_DAYS = 30;
const TREND_DAYS = 7;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Local calendar date as YYYY-MM-DD. Progress.date is stored as LOCAL midnight,
// so toISOString() (UTC) labelled every day as the day before anywhere east of
// UTC — in Tashkent (UTC+5) local midnight is 19:00 UTC of the previous date.
function localDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface SubjectActivity {
  subjectId: string;
  subjectName: string;
  sessionCount: number;
  minutes: number;
}

export interface DailyTrendPoint {
  date: string; // ISO date, no time
  minutes: number;
}

export interface StudyStats {
  plannedTasks: number;
  completedTasks: number;
  incompleteTasks: number;
  completionRate: number; // 0-100, tasks-based
  plannedMinutes: number; // sum of Schedule.minutes for all tasks in the period
  actualMinutes: number; // sum of real elapsed minutes from completed StudySessions
  actualVsPlannedRate: number; // 0-100 — how much of the planned time really happened
  sessionCount: number; // StudySessions started in the period
  avgSessionMinutes: number;
  consistencyScore: number;
  currentStreak: number;
  subjectBreakdown: SubjectActivity[];
  dailyTrend: DailyTrendPoint[];
}

export class StudyAnalyticsService {
  constructor(
    private scheduleRepo = new ScheduleRepository(prisma),
    private sessionRepo = new StudySessionRepository(prisma),
    private consistencyRepo = new ConsistencyRepository(prisma),
    private subjectRepo = new SubjectRepository(prisma),
    private gamification = new GamificationService(),
    private consistencyService = new ConsistencyService()
  ) {}

  async getStats(studentId: string, lang: Lang): Promise<StudyStats> {
    const since = new Date();
    since.setDate(since.getDate() - PERIOD_DAYS);
    since.setHours(0, 0, 0, 0);
    const periodEnd = new Date();

    const [scheduleItems, sessions, subjects, progress, consistency, streak] = await Promise.all([
      this.scheduleRepo.findRecent(studentId, since),
      this.sessionRepo.findRecent(studentId, since),
      this.subjectRepo.findAll(),
      this.consistencyRepo.progressInRange(studentId, since, periodEnd),
      this.consistencyService.getScore(studentId),
      this.gamification.currentStreak(studentId),
    ]);

    const subjectNameById = new Map(subjects.map((s) => [s.id, pick(s.nameUz, s.nameRu, lang)]));

    const plannedTasks = scheduleItems.length;
    const completedTasks = scheduleItems.filter((i) => i.status === "COMPLETED").length;
    const incompleteTasks = plannedTasks - completedTasks;
    const completionRate = plannedTasks > 0 ? round1((completedTasks / plannedTasks) * 100) : 0;

    const plannedMinutes = scheduleItems.reduce((sum, i) => sum + i.minutes, 0);
    const completedSessions = sessions.filter((s) => s.status === "COMPLETED");
    const actualMinutes = completedSessions.reduce((sum, s) => sum + s.minutes, 0);
    const actualVsPlannedRate = plannedMinutes > 0 ? round1((actualMinutes / plannedMinutes) * 100) : 0;

    const avgSessionMinutes = completedSessions.length > 0 ? round1(actualMinutes / completedSessions.length) : 0;

    const bySubject = new Map<string, { sessionCount: number; minutes: number }>();
    for (const s of completedSessions) {
      if (!s.subjectId) continue;
      const entry = bySubject.get(s.subjectId) ?? { sessionCount: 0, minutes: 0 };
      entry.sessionCount += 1;
      entry.minutes += s.minutes;
      bySubject.set(s.subjectId, entry);
    }
    const subjectBreakdown: SubjectActivity[] = [...bySubject.entries()]
      .map(([subjectId, v]) => ({ subjectId, subjectName: subjectNameById.get(subjectId) ?? subjectId, ...v }))
      .sort((a, b) => b.minutes - a.minutes);

    // Progress.studyMinutes is 0 for quiz-driven days by design — add the real
    // quiz-session time back in, same as ProgressService.getOverview does.
    const quizMinutesByDay = new Map<string, number>();
    for (const s of completedSessions) {
      if (s.source !== "QUIZ" || !s.completedAt) continue;
      const key = localDateKey(s.completedAt);
      quizMinutesByDay.set(key, (quizMinutesByDay.get(key) ?? 0) + s.minutes);
    }
    const dailyTrend: DailyTrendPoint[] = progress.slice(-TREND_DAYS).map((p) => {
      const date = localDateKey(p.date);
      return { date, minutes: p.studyMinutes + (quizMinutesByDay.get(date) ?? 0) };
    });

    return {
      plannedTasks,
      completedTasks,
      incompleteTasks,
      completionRate,
      plannedMinutes,
      actualMinutes,
      actualVsPlannedRate,
      // completedSessions, not sessions — avgSessionMinutes and
      // subjectBreakdown below are already completed-only, so counting every
      // session here (including abandoned/still-open/auto-skipped ones) made
      // this number not reconcile with either of those on the same card.
      sessionCount: completedSessions.length,
      avgSessionMinutes,
      consistencyScore: consistency.score,
      currentStreak: streak,
      subjectBreakdown,
      dailyTrend,
    };
  }

  /**
   * Simple, deterministic (non-AI) recommendation derived from the stats above —
   * intentionally rule-based per the request, not routed through AIProvider.
   * Mirrors RuleBasedProvider's spirit: transparent, testable, no external call.
   */
  async getRecommendation(studentId: string, lang: Lang): Promise<string> {
    const stats = await this.getStats(studentId, lang);
    return this.buildRecommendation(stats, lang);
  }

  buildRecommendation(stats: StudyStats, lang: Lang): string {
    // Find the subject with the worst drop-off: subjects the student keeps starting
    // (or planning) but rarely finishing, among subjects with at least a couple of
    // data points so a single skipped task doesn't trigger a false signal.
    const worstSubject = stats.subjectBreakdown
      .filter((s) => s.sessionCount >= 2)
      .find((s) => s.minutes / Math.max(1, s.sessionCount) < 20);

    if (worstSubject) {
      return pick(
        `Oxirgi kunlarda "${worstSubject.subjectName}" vazifalarining bir qismi bajarilmay qolmoqda. Keyingi rejada bu fan uchun qisqaroq sessionlardan foydalanish tavsiya qilinadi.`,
        `В последнее время часть заданий по предмету «${worstSubject.subjectName}» остаётся незавершённой. В следующем расписании рекомендуется использовать более короткие сессии для этого предмета.`,
        lang
      );
    }

    if (stats.plannedMinutes > 0 && stats.actualVsPlannedRate < 50) {
      return pick(
        `Rejalashtirilgan vaqtning taxminan ${Math.round(stats.actualVsPlannedRate)}% bajarilmoqda. Kichikroq, bajarish osonroq vazifalar bilan boshlash foydali bo'lishi mumkin.`,
        `Выполняется примерно ${Math.round(stats.actualVsPlannedRate)}% запланированного времени. Может быть полезно начать с более коротких и достижимых задач.`,
        lang
      );
    }

    if (stats.currentStreak >= 7) {
      return pick(
        `${stats.currentStreak} kunlik ketma-ket faollik — ajoyib barqarorlik! Shu sur'atni davom ettiring.`,
        `${stats.currentStreak} дней подряд активности — отличная стабильность! Продолжайте в том же духе.`,
        lang
      );
    }

    return pick(
      "Faoliyatingiz haqida xulosa chiqarish uchun hali yetarli ma'lumot yo'q — davom eting, tez orada shaxsiy tavsiyalar paydo bo'ladi.",
      "Пока недостаточно данных для выводов о вашей активности — продолжайте заниматься, скоро появятся персональные рекомендации.",
      lang
    );
  }
}
