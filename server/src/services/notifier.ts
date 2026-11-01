import { NotificationType, PrismaClient } from "@prisma/client";
import { prisma } from "../config/prisma";

/** One notification's text in both UI languages, plus an optional in-app link. */
export type NotificationText = { title: string; body: string; titleRu?: string; bodyRu?: string; link?: string };

/**
 * Automatic notifications. Every method is best-effort: a notification is a
 * side effect, so a failure here must never break the action that caused it
 * (a quiz submit, a sign-up...). Errors are swallowed on purpose.
 */
export class Notifier {
  constructor(private db: PrismaClient = prisma) {}

  private async send(userIds: string[], type: NotificationType, text: NotificationText) {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (ids.length === 0) return 0;
    const res = await this.db.notification.createMany({
      data: ids.map((recipientId) => ({
        recipientId,
        type,
        title: text.title,
        body: text.body,
        titleRu: text.titleRu ?? "",
        bodyRu: text.bodyRu ?? "",
        link: text.link ?? "",
      })),
    });
    return res.count;
  }

  private async safely(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch {
      /* non-critical side effect */
    }
  }

  /** The student's own user id, name and their linked parent's user id (if any). */
  private async people(studentId: string) {
    const s = await this.db.student.findUnique({
      where: { id: studentId },
      select: { userId: true, user: { select: { fullName: true } }, parent: { select: { userId: true } } },
    });
    if (!s) return null;
    return { studentUserId: s.userId, name: s.user.fullName, parentUserId: s.parent?.userId ?? null };
  }

  welcome(userId: string, role: "STUDENT" | "PARENT") {
    return this.safely(() =>
      this.send([userId], "SYSTEM", role === "STUDENT"
        ? {
            title: "Xush kelibsiz! 👋",
            body: "Birinchi qadam: \"Testlar\" bo'limida o'z sinfingiz fanidan test yechib ko'ring.",
            titleRu: "Добро пожаловать! 👋",
            bodyRu: "Первый шаг: пройдите тест по предмету своего класса в разделе «Тесты».",
            link: "/quiz",
          }
        : {
            title: "Xush kelibsiz! 👋",
            body: "Farzandingiz profilida sizning emailingizni ulasa, uning natijalari shu yerda ko'rinadi.",
            titleRu: "Добро пожаловать! 👋",
            bodyRu: "Когда ребёнок привяжет ваш email в своём профиле, его результаты появятся здесь.",
          })
    );
  }

  badgesEarned(studentId: string, badges: { nameUz: string; nameRu: string; icon: string }[]) {
    if (badges.length === 0) return Promise.resolve();
    return this.safely(async () => {
      const p = await this.people(studentId);
      if (!p) return;
      for (const b of badges) {
        await this.send([p.studentUserId], "BADGE", {
          title: `${b.icon} Yangi yutuq: ${b.nameUz}`,
          body: "Tabriklaymiz! Barcha yutuqlaringizni \"Yutuqlar\" bo'limida ko'ring.",
          titleRu: `${b.icon} Новое достижение: ${b.nameRu}`,
          bodyRu: "Поздравляем! Все достижения — в разделе «Достижения».",
          link: "/achievements",
        });
        if (p.parentUserId) {
          await this.send([p.parentUserId], "BADGE", {
            title: `${b.icon} ${p.name} yangi yutuq oldi`,
            body: `"${b.nameUz}" yutug'i qo'lga kiritildi.`,
            titleRu: `${b.icon} ${p.name} получил(а) достижение`,
            bodyRu: `Получено достижение «${b.nameRu}».`,
          });
        }
      }
    });
  }

  quizCompleted(studentId: string, subject: { nameUz: string; nameRu: string }, grade: number, score: number) {
    return this.safely(async () => {
      const p = await this.people(studentId);
      if (!p?.parentUserId) return;
      await this.send([p.parentUserId], "PARENT_REPORT", {
        title: `📝 ${p.name}: ${subject.nameUz} — ${score}%`,
        body: `${grade}-sinf ${subject.nameUz} testi topshirildi. Natija: ${score}%.`,
        titleRu: `📝 ${p.name}: ${subject.nameRu} — ${score}%`,
        bodyRu: `Пройден тест по предмету «${subject.nameRu}» за ${grade} класс. Результат: ${score}%.`,
      });
    });
  }

  dtmCompleted(studentId: string, subject: { nameUz: string; nameRu: string }, points: number, maxPoints: number) {
    return this.safely(async () => {
      const p = await this.people(studentId);
      if (!p?.parentUserId) return;
      await this.send([p.parentUserId], "PARENT_REPORT", {
        title: `🎓 ${p.name}: DTM mashqi`,
        body: `${subject.nameUz} bo'yicha namunaviy DTM testi: ${points} / ${maxPoints} ball.`,
        titleRu: `🎓 ${p.name}: пробный тест DTM`,
        bodyRu: `Пробный тест DTM по предмету «${subject.nameRu}»: ${points} / ${maxPoints} баллов.`,
      });
    });
  }

  careerTestCompleted(studentId: string, topCareers: { nameUz: string; nameRu: string }[]) {
    return this.safely(async () => {
      const p = await this.people(studentId);
      if (!p) return;
      const uz = topCareers.slice(0, 3).map((c) => c.nameUz).join(", ");
      const ru = topCareers.slice(0, 3).map((c) => c.nameRu).join(", ");
      await this.send([p.studentUserId], "GOAL", {
        title: "🧭 Kasb tanlash testi natijasi tayyor",
        body: uz ? `Sizga eng mos kasblar: ${uz}.` : "Natijangizni ko'ring.",
        titleRu: "🧭 Результат профтеста готов",
        bodyRu: ru ? `Самые подходящие профессии: ${ru}.` : "Посмотрите свой результат.",
        link: "/career",
      });
      if (p.parentUserId) {
        await this.send([p.parentUserId], "PARENT_REPORT", {
          title: `🧭 ${p.name} kasb tanlash testini topshirdi`,
          body: uz ? `Eng mos kasblar: ${uz}.` : "Natija tayyor.",
          titleRu: `🧭 ${p.name} прошёл(а) профтест`,
          bodyRu: ru ? `Самые подходящие профессии: ${ru}.` : "Результат готов.",
        });
      }
    });
  }

  parentLinked(studentId: string) {
    return this.safely(async () => {
      const p = await this.people(studentId);
      if (!p?.parentUserId) return;
      await this.send([p.parentUserId], "SYSTEM", {
        title: `🔗 ${p.name} profilingizga ulandi`,
        body: "Endi uning test natijalari va yutuqlari haqida xabar olasiz.",
        titleRu: `🔗 ${p.name} привязан(а) к вашему профилю`,
        bodyRu: "Теперь вы будете получать уведомления о его/её результатах и достижениях.",
      });
    });
  }

  /**
   * "Don't lose your streak": sent at most once a day, when the student had a
   * streak of 2+ days up to yesterday and hasn't studied yet today. Called
   * when the student opens the app (there is no background scheduler).
   */
  streakReminder(studentId: string, streakUntilYesterday: number, studiedToday: boolean) {
    if (studiedToday || streakUntilYesterday < 2) return Promise.resolve();
    return this.safely(async () => {
      const p = await this.people(studentId);
      if (!p) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const already = await this.db.notification.count({
        where: { recipientId: p.studentUserId, type: "STREAK", createdAt: { gte: today } },
      });
      if (already > 0) return;
      await this.send([p.studentUserId], "STREAK", {
        title: `🔥 ${streakUntilYesterday} kunlik seriyangizni saqlang`,
        body: "Bugun bitta test yechsangiz, seriya davom etadi.",
        titleRu: `🔥 Сохраните серию из ${streakUntilYesterday} дней`,
        bodyRu: "Пройдите сегодня один тест — и серия продолжится.",
        link: "/quiz",
      });
    });
  }

  /**
   * Admin broadcast. audience: who gets it; grade narrows students (and, for
   * parents, those whose child is in that grade); email targets one user.
   */
  async broadcast(
    text: NotificationText,
    target: { audience: "STUDENTS" | "PARENTS" | "ALL"; grade?: number; email?: string }
  ): Promise<number> {
    let userIds: string[];
    if (target.email) {
      const u = await this.db.user.findFirst({
        where: { email: { equals: target.email, mode: "insensitive" }, status: "ACTIVE" },
        select: { id: true },
      });
      userIds = u ? [u.id] : [];
    } else {
      const students =
        target.audience === "PARENTS"
          ? []
          : await this.db.student.findMany({
              where: { ...(target.grade ? { grade: target.grade } : {}), user: { status: "ACTIVE" } },
              select: { userId: true },
            });
      const parents =
        target.audience === "STUDENTS"
          ? []
          : await this.db.parent.findMany({
              where: {
                user: { status: "ACTIVE" },
                ...(target.grade ? { students: { some: { grade: target.grade } } } : {}),
              },
              select: { userId: true },
            });
      userIds = [...students, ...parents].map((x) => x.userId);
    }
    return this.send(userIds, "SYSTEM", text);
  }
}

export const notifier = new Notifier();
