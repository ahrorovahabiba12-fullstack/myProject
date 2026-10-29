import { PrismaClient, UserStatus } from "@prisma/client";

export class AdminRepository {
  constructor(private db: PrismaClient) {}

  countUsersByRole() {
    return this.db.user.groupBy({ by: ["role"], _count: { _all: true } });
  }

  countStudentsByGrade() {
    return this.db.student.groupBy({ by: ["grade"], _count: { _all: true }, orderBy: { grade: "asc" } });
  }

  usersCreatedSince(since: Date) {
    return this.db.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } });
  }

  quizResultsCreatedSince(since: Date) {
    return this.db.quizResult.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } });
  }

  quizStatsAllTime() {
    return this.db.quizResult.aggregate({ _count: { _all: true }, _avg: { score: true } });
  }

  countActiveStudentsToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // OR completedTasks too — quiz-only activity leaves studyMinutes at 0 by
    // design (see quizService), so studyMinutes alone would miss those students.
    return this.db.progress.count({
      where: { date: today, OR: [{ studyMinutes: { gt: 0 } }, { completedTasks: { gt: 0 } }] },
    });
  }

  countAIConversations() {
    return this.db.aIConversation.count();
  }

  countAIMessages() {
    return this.db.aIMessage.count();
  }

  countAchievements() {
    return this.db.achievement.count();
  }

  countUnreadNotifications() {
    return this.db.notification.count({ where: { read: false } });
  }

  // Capped rather than paginated — matches the rest of the admin dashboard
  // (aggregate views only), and a real pagination UI isn't needed yet for
  // the user counts this app actually has.
  listUsers() {
    return this.db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        student: { select: { grade: true } },
        parent: { select: { students: { select: { id: true } } } },
      },
    });
  }

  findUserById(userId: string) {
    return this.db.user.findUnique({ where: { id: userId }, select: { id: true, status: true } });
  }

  updateUserStatus(userId: string, status: UserStatus) {
    return this.db.user.update({ where: { id: userId }, data: { status } });
  }

  listActiveStudentsToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.db.progress.findMany({
      where: { date: today, OR: [{ studyMinutes: { gt: 0 } }, { completedTasks: { gt: 0 } }] },
      select: {
        studentId: true,
        studyMinutes: true,
        student: { select: { grade: true, user: { select: { fullName: true, email: true } } } },
      },
    });
  }

  // Real elapsed time for today's quiz-triggered sessions, per student —
  // Progress.studyMinutes above is 0 for these by design (see quizService),
  // so the admin service adds this on top to show true per-student activity.
  todayQuizMinutesByStudent() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.db.studySession.groupBy({
      by: ["studentId"],
      where: { status: "COMPLETED", source: "QUIZ", completedAt: { gte: today } },
      _sum: { minutes: true },
    });
  }

  listSubjects() {
    return this.db.subject.findMany({
      orderBy: { nameUz: "asc" },
      include: { _count: { select: { questions: true } } },
    });
  }

  listCareers() {
    return this.db.career.findMany({ orderBy: { nameUz: "asc" } });
  }

  listUniversities() {
    return this.db.university.findMany({ orderBy: { nameUz: "asc" } });
  }

  catalogCounts() {
    return Promise.all([
      this.db.subject.count(),
      this.db.question.count(),
      this.db.career.count(),
      this.db.university.count(),
    ]);
  }
}
