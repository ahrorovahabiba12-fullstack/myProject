import { getAIProvider } from "../providers/ai";
import { ScheduleRepository } from "../repositories/scheduleRepository";
import { StudentRepository } from "../repositories/studentRepository";
import { SubjectRepository } from "../repositories/subjectRepository";
import { GamificationRepository } from "../repositories/gamificationRepository";
import { StudySessionRepository } from "../repositories/studySessionRepository";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { Lang } from "../middleware/language";
import { pick } from "../utils/localize";

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const PLAN_MINUTES_PER_DAY = 90;

// Schedule.dayOfWeek convention: 1 (Monday) .. 7 (Sunday).
function todayIsoDay(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
}

export class ScheduleService {
  constructor(
    private ai = getAIProvider(),
    private repo = new ScheduleRepository(prisma),
    private studentRepo = new StudentRepository(prisma),
    private subjectRepo = new SubjectRepository(prisma),
    private gamificationRepo = new GamificationRepository(prisma),
    private studySessionRepo = new StudySessionRepository(prisma)
  ) {}

  private localizeWeek(items: Awaited<ReturnType<ScheduleRepository["findByWeek"]>>, lang: Lang) {
    return items.map(({ studySessions, titleRu, ...i }) => ({
      ...i,
      // Rows created before titleRu existed have it as "" — fall back to the
      // original (Uzbek) title rather than showing a blank.
      title: pick(i.title, titleRu || i.title, lang),
      subject: i.subject ? { ...i.subject, name: pick(i.subject.nameUz, i.subject.nameRu, lang) } : null,
      // Real time actually spent on this task (summed across every completed
      // attempt), never the planned Schedule.minutes — a student who finished
      // in 12 minutes shouldn't see the 45-minute plan reported as fact.
      // actualSeconds is the precise figure the UI formats as mm:ss; actualMinutes
      // stays as a rounded convenience value for anything that only wants minutes.
      actualSeconds: studySessions.filter((s) => s.status === "COMPLETED").reduce((sum, s) => sum + s.seconds, 0),
      actualMinutes: studySessions.filter((s) => s.status === "COMPLETED").reduce((sum, s) => sum + s.minutes, 0),
    }));
  }

  async getCurrentWeek(studentId: string, lang: Lang) {
    const weekStart = mondayOf(new Date());
    await this.skipPastDueItems(studentId, weekStart);
    const existing = await this.repo.findByWeek(studentId, weekStart);
    if (existing.length > 0) return this.localizeWeek(existing, lang);
    return this.localizeWeek(await this.generateWeekRaw(studentId, weekStart), lang);
  }

  // A TODO/IN_PROGRESS item whose day has already passed (earlier this same
  // week) is never coming back — nothing in the app can ever move it forward
  // again (the Play button only appears on today's card). Left alone it
  // would show "Davom etmoqda" forever for a quiz the student started but
  // never finished that day. Runs on every getCurrentWeek read so this
  // resolves itself the next time the student opens the page, no cron needed.
  private async skipPastDueItems(studentId: string, weekStart: Date) {
    const pastDue = await this.repo.findPastDueOpenItems(studentId, weekStart, todayIsoDay());
    if (pastDue.length === 0) return;

    const inProgressIds = pastDue.filter((i) => i.status === "IN_PROGRESS").map((i) => i.id);
    if (inProgressIds.length > 0) {
      await this.studySessionRepo.abandonActiveForSchedules(inProgressIds);
    }
    await this.repo.skipItems(pastDue.map((i) => i.id));
  }

  async generateWeek(studentId: string, lang: Lang) {
    const weekStart = mondayOf(new Date());
    // Same as getCurrentWeek: an unfinished item from a day that's already
    // gone is recorded as SKIPPED first — otherwise deleteTodoItems below
    // would erase it as if it had never been planned at all.
    await this.skipPastDueItems(studentId, weekStart);
    return this.localizeWeek(await this.generateWeekRaw(studentId, weekStart), lang);
  }

  // Both languages of every title are generated and stored together (see
  // LearningPlanOutput) — a weekly plan carries real status/study-session state per
  // item, so unlike other AI content it must never be silently regenerated (and that
  // state lost) just because the student toggles the UI language. localizeWeek()
  // picks the right stored language at read time instead.
  private async generateWeekRaw(studentId: string, weekStart: Date) {
    // Only today and the days still ahead can be planned. An item written for
    // a day that's already gone can never be started (the Play button only
    // appears on today's card), so the next getCurrentWeek read flipped it
    // straight to SKIPPED: a student joining on a Thursday saw Mon-Wed as
    // "missed", and every mid-week "Qayta yaratish" piled more SKIPPED rows
    // onto past days, dragging completionRate down for tasks they never had
    // a chance to do. On Sunday (a rest day) nothing is left this week.
    const firstPlannableDay = todayIsoDay();
    if (firstPlannableDay > 6) return this.repo.findByWeek(studentId, weekStart);

    const student = await this.studentRepo.findById(studentId);
    if (!student) throw AppError.notFound("Student topilmadi");

    const weak = student.subjectLevels
      .filter((s) => s.level === "WEAK")
      .map((s) => ({ code: s.subject.code, nameUz: s.subject.nameUz, nameRu: s.subject.nameRu }));
    // MEDIUM (50-79%) is the most common level a student has — leaving it out
    // meant a student whose subjects were all MEDIUM got a week of subject-less
    // "Umumiy takrorlash" days with nothing for the Play button to open.
    const medium = student.subjectLevels
      .filter((s) => s.level === "MEDIUM")
      .map((s) => ({ code: s.subject.code, nameUz: s.subject.nameUz, nameRu: s.subject.nameRu }));
    const strong = student.subjectLevels
      .filter((s) => s.level === "STRONG")
      .map((s) => ({ code: s.subject.code, nameUz: s.subject.nameUz, nameRu: s.subject.nameRu }));

    // Subjects with no quiz result yet for this student — otherwise the week is limited
    // to only whichever 1-2 subjects the student happens to have taken a quiz in.
    const testedCodes = new Set(student.subjectLevels.map((s) => s.subject.code));
    const allSubjects = await this.subjectRepo.findAll();
    const neutral = allSubjects
      .filter((s) => !testedCodes.has(s.code))
      .map((s) => ({ code: s.code, nameUz: s.nameUz, nameRu: s.nameRu }));

    const plan = await this.ai.generateLearningPlan({
      grade: student.grade,
      weakSubjects: weak,
      mediumSubjects: medium,
      strongSubjects: strong,
      neutralSubjects: neutral,
      availableMinutesPerDay: PLAN_MINUTES_PER_DAY,
    });

    const subjectIdByCode = new Map(allSubjects.map((s) => [s.code, s.id]));

    // Regenerating (whether from "Qayta yaratish" or an empty getCurrentWeek)
    // must never erase a student's real progress: only never-started (TODO)
    // items are cleared before writing the fresh plan. An IN_PROGRESS or
    // COMPLETED item — and the StudySession history attached to it — is left
    // exactly as it is.
    await this.repo.deleteTodoItems(studentId, weekStart);
    await this.repo.createMany(
      studentId,
      weekStart,
      plan.days.filter((d) => d.dayOfWeek >= firstPlannableDay).map((d) => ({
        dayOfWeek: d.dayOfWeek,
        title: d.title,
        titleRu: d.titleRu,
        subjectCode: d.subjectCode,
        // Business-rule clamp before the DB, like every other AI output:
        // Schedule.minutes is an Int, so a model's "12.5" made createMany
        // throw (a 500 the provider fallback never sees, since it happens
        // after the provider call), and 0/negative/huge values are nonsense.
        minutes: Math.min(PLAN_MINUTES_PER_DAY, Math.max(1, Math.round(d.minutes))),
      })),
      subjectIdByCode
    );

    return this.repo.findByWeek(studentId, weekStart);
  }

  async markStatus(studentId: string, scheduleId: string, status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED") {
    const item = await this.repo.findOne(scheduleId, studentId);
    if (!item) throw AppError.notFound("Reja topilmadi");
    if (item.status === status) return { success: true };

    // Only the request that actually moves the item out of the status read
    // above may run the side effects below — a concurrent duplicate (double
    // click, retry) used to pass the same read and credit Progress twice.
    const { count } = await this.repo.updateStatusIfCurrent(scheduleId, studentId, item.status, status);
    if (count === 0) return { success: true };

    // StudySession side-effect — records the real start/end of this attempt at the task.
    // Kept independent of the Progress crediting below: Progress still credits the
    // Schedule item's *planned* minutes exactly as before (unchanged), while StudySession
    // separately captures the *real* elapsed time for future use (e.g. AI analysis).
    if (status === "IN_PROGRESS") {
      const active = await this.studySessionRepo.findActive(scheduleId, studentId);
      if (!active) {
        await this.studySessionRepo.start(studentId, scheduleId, item.subjectId, "SCHEDULE");
      }
    } else if (status === "COMPLETED") {
      const active = await this.studySessionRepo.findActive(scheduleId, studentId);
      if (active) {
        const completedAt = new Date();
        const elapsedSeconds = Math.max(0, Math.round((completedAt.getTime() - active.startedAt.getTime()) / 1000));
        await this.studySessionRepo.complete(active.id, completedAt, Math.round(elapsedSeconds / 60), elapsedSeconds);
      }
    }

    // Crediting is driven by the actual COMPLETED transition (either direction), not by
    // which specific statuses are involved — so this stays correct whether the student
    // goes TODO -> IN_PROGRESS -> COMPLETED, or jumps straight to COMPLETED, and an undo
    // (COMPLETED -> anything else) cleanly reverses the same amount it credited.
    const wasCompleted = item.status === "COMPLETED";
    const nowCompleted = status === "COMPLETED";
    if (!wasCompleted && nowCompleted) {
      await this.gamificationRepo.upsertTodayProgress(studentId, item.minutes, 1, 0);
    } else if (wasCompleted && !nowCompleted) {
      // A completion reached via a quiz (QuizService.submitQuiz -> autoTransitionForSubject)
      // never comes through this method at all — it credits Progress itself, with its own
      // model (completedTasks + the quiz score, never studyMinutes), and leaves lastScore
      // as the only trace of that on the item. Reversing THIS method's own studyMinutes-based
      // credit here would debit minutes that were never added and leave the quiz's score
      // credit stuck forever. lastScore is only ever set by that quiz path, so it tells us
      // which model to undo.
      if (item.lastScore !== null) {
        await this.gamificationRepo.upsertTodayProgress(studentId, 0, -1, -item.lastScore);
      } else {
        await this.gamificationRepo.upsertTodayProgress(studentId, -item.minutes, -1, 0);
      }
    }

    return { success: true };
  }

  /**
   * Best-effort automatic transition used when quiz activity implies real study on a
   * subject (see QuizService). Only ever moves TODAY's schedule item(s) for the given
   * subject forward (TODO -> IN_PROGRESS, or up to COMPLETED) — never backward, and
   * never touches items already at or past the target status.
   *
   * Deliberately does NOT call gamificationRepo.upsertTodayProgress: the caller (quiz
   * submission) already credits Progress for this same real-world action, so crediting
   * here too would double-count. StudySession bookkeeping still applies, so the
   * schedule item's real elapsed time is still captured like any other completion.
   *
   * When completing (score provided) and no matching item exists for today — the quiz
   * was for a subject outside today's plan — a new COMPLETED item is inserted instead
   * of the activity going unrecorded, so today's Schedule reflects all real study, not
   * only what was originally planned.
   */
  async autoTransitionForSubject(
    studentId: string,
    subjectId: string,
    targetStatus: "IN_PROGRESS" | "COMPLETED",
    score?: number,
    // Real quiz-taking duration (start-to-submit), supplied by the caller when known.
    // Authoritative over inferring elapsed time from StudySession.startedAt — and,
    // unlike that inference, still available even when no StudySession was ever
    // started for this item (e.g. a subject outside today's plan).
    elapsedSeconds?: number
  ) {
    const today = new Date();
    const weekStart = mondayOf(today);
    const jsDay = today.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay; // Schedule.dayOfWeek is 1 (Monday) .. 7 (Sunday)

    const items = await this.repo.findByWeek(studentId, weekStart);
    const todays = items.filter((i) => i.dayOfWeek === isoDay && i.subjectId === subjectId);

    for (const item of todays) {
      if (targetStatus === "IN_PROGRESS") {
        if (item.status !== "TODO") continue;
        await this.repo.updateStatus(item.id, studentId, "IN_PROGRESS");
        const active = await this.studySessionRepo.findActive(item.id, studentId);
        if (!active) await this.studySessionRepo.start(studentId, item.id, item.subjectId, "QUIZ");
      } else {
        if (item.status === "COMPLETED") continue;
        await this.repo.updateStatus(item.id, studentId, "COMPLETED", score);
        const active = await this.studySessionRepo.findActive(item.id, studentId);
        const completedAt = new Date();
        if (elapsedSeconds !== undefined) {
          const minutes = Math.round(elapsedSeconds / 60);
          if (active) {
            await this.studySessionRepo.complete(active.id, completedAt, minutes, elapsedSeconds);
          } else {
            const startedAt = new Date(completedAt.getTime() - elapsedSeconds * 1000);
            await this.studySessionRepo.createCompleted(studentId, item.id, item.subjectId, startedAt, completedAt, minutes, elapsedSeconds, "QUIZ");
          }
        } else if (active) {
          const elapsed = Math.max(0, Math.round((completedAt.getTime() - active.startedAt.getTime()) / 1000));
          await this.studySessionRepo.complete(active.id, completedAt, Math.round(elapsed / 60), elapsed);
        }
      }
    }

    if (targetStatus === "COMPLETED" && todays.length === 0 && score !== undefined) {
      const subject = await this.subjectRepo.findById(subjectId);
      if (subject) {
        const title = `${subject.nameUz} bo'yicha test`;
        const titleRu = `Тест по предмету «${subject.nameRu}»`;
        const created = await this.repo.createCompletedNow(
          studentId,
          weekStart,
          isoDay,
          subjectId,
          title,
          titleRu,
          20,
          score
        );
        if (elapsedSeconds !== undefined) {
          const completedAt = new Date();
          const startedAt = new Date(completedAt.getTime() - elapsedSeconds * 1000);
          const minutes = Math.round(elapsedSeconds / 60);
          await this.studySessionRepo.createCompleted(studentId, created.id, subjectId, startedAt, completedAt, minutes, elapsedSeconds, "QUIZ");
        }
      }
    }
  }
}
