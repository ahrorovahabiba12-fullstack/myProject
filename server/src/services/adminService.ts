import { UserStatus } from "@prisma/client";
import { AdminRepository } from "../repositories/adminRepository";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

const TREND_DAYS = 14;

// Bucket keys/boundaries are computed in UTC throughout (never local time) —
// mixing the two would shift "today" by a day in timezones behind UTC.
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Buckets a list of timestamps into a fixed, gap-free window of daily counts
// (today back TREND_DAYS-1 days) so the frontend can chart a trend line
// without needing to know which days had zero activity.
function bucketByDay(dates: Date[], days: number): { date: string; count: number }[] {
  const buckets = new Map<string, number>();
  const today = startOfUTCDay(new Date());
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.set(dayKey(d), 0);
  }
  for (const date of dates) {
    const key = dayKey(date);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

export class AdminService {
  constructor(private repo = new AdminRepository(prisma)) {}

  async getStats() {
    const today = startOfUTCDay(new Date());
    const since = new Date(today);
    since.setUTCDate(since.getUTCDate() - (TREND_DAYS - 1));

    const [
      usersByRole,
      studentsByGrade,
      newUsers,
      recentQuizzes,
      quizStats,
      activeStudentsToday,
      aiConversations,
      aiMessages,
      totalAchievements,
      unreadNotifications,
      [subjects, questions, careers, universities],
    ] = await Promise.all([
      this.repo.countUsersByRole(),
      this.repo.countStudentsByGrade(),
      this.repo.usersCreatedSince(since),
      this.repo.quizResultsCreatedSince(since),
      this.repo.quizStatsAllTime(),
      this.repo.countActiveStudentsToday(),
      this.repo.countAIConversations(),
      this.repo.countAIMessages(),
      this.repo.countAchievements(),
      this.repo.countUnreadNotifications(),
      this.repo.catalogCounts(),
    ]);

    const roleCounts: Record<string, number> = Object.fromEntries(
      usersByRole.map((r) => [r.role, r._count._all])
    );

    return {
      users: {
        total: usersByRole.reduce((sum, r) => sum + r._count._all, 0),
        students: roleCounts.STUDENT ?? 0,
        parents: roleCounts.PARENT ?? 0,
        admins: roleCounts.ADMIN ?? 0,
        newUsersTrend: bucketByDay(newUsers.map((u) => u.createdAt), TREND_DAYS),
      },
      studentsByGrade: studentsByGrade.map((g) => ({ grade: g.grade, count: g._count._all })),
      quizzes: {
        totalAttempts: quizStats._count._all,
        averageScore: Math.round((quizStats._avg.score ?? 0) * 10) / 10,
        attemptsTrend: bucketByDay(recentQuizzes.map((q) => q.createdAt), TREND_DAYS),
      },
      engagement: {
        activeStudentsToday,
        aiConversations,
        aiMessages,
        totalAchievements,
        unreadNotifications,
      },
      catalog: { subjects, questions, careers, universities },
    };
  }

  async listActiveStudentsToday() {
    const [rows, quizMinutes] = await Promise.all([
      this.repo.listActiveStudentsToday(),
      this.repo.todayQuizMinutesByStudent(),
    ]);
    const quizByStudent = new Map(quizMinutes.map((q) => [q.studentId, q._sum.minutes ?? 0]));
    return rows
      .map((r) => ({
        fullName: r.student.user.fullName,
        email: r.student.user.email,
        grade: r.student.grade,
        studyMinutes: r.studyMinutes + (quizByStudent.get(r.studentId) ?? 0),
      }))
      .sort((a, b) => b.studyMinutes - a.studyMinutes);
  }

  async listSubjects() {
    const subjects = await this.repo.listSubjects();
    return subjects.map((s) => ({
      id: s.id,
      code: s.code,
      nameUz: s.nameUz,
      nameRu: s.nameRu,
      active: s.active,
      questionCount: s._count.questions,
    }));
  }

  async listCareers() {
    const careers = await this.repo.listCareers();
    return careers.map((c) => ({
      id: c.id,
      code: c.code,
      nameUz: c.nameUz,
      nameRu: c.nameRu,
      minGrade: c.minGrade,
    }));
  }

  async listUniversities() {
    const universities = await this.repo.listUniversities();
    return universities.map((u) => ({
      id: u.id,
      nameUz: u.nameUz,
      nameRu: u.nameRu,
      country: u.country,
      city: u.city,
    }));
  }

  async listUsers() {
    const users = await this.repo.listUsers();
    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      grade: u.student?.grade ?? null,
      childrenCount: u.parent ? u.parent.students.length : null,
    }));
  }

  async updateUserStatus(requestingAdminId: string, targetUserId: string, status: UserStatus) {
    if (requestingAdminId === targetUserId) {
      throw AppError.badRequest("O'zingizni bloklay olmaysiz");
    }
    const target = await this.repo.findUserById(targetUserId);
    if (!target) throw AppError.notFound("Foydalanuvchi topilmadi");

    const updated = await this.repo.updateUserStatus(targetUserId, status);
    return { id: updated.id, status: updated.status };
  }
}
