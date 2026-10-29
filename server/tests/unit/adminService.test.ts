import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { Role } from "@prisma/client";
import { AdminService } from "../../src/services/adminService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser, createParentUser, createSubject, createCareer, createBadge } from "../helpers/fixtures";

describe("AdminService.getStats (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("aggregates role counts", async () => {
    await createStudentUser();
    await createStudentUser();
    await createParentUser();
    await createParentUser();
    await prisma.user.create({
      data: { email: "admin-stats-test@test.uz", passwordHash: "x", fullName: "Admin", role: Role.ADMIN },
    });

    const stats = await new AdminService().getStats();

    expect(stats.users).toMatchObject({ total: 5, students: 2, parents: 2, admins: 1 });
  });

  it("rounds the average quiz score to one decimal from real QuizResult rows", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject();
    await prisma.quizResult.createMany({
      data: [70, 70, 71].map((score) => ({
        studentId: student.id,
        subjectId: subject.id,
        grade: 9,
        score,
        level: "MEDIUM" as const,
        attemptDate: new Date(),
      })),
    });

    const stats = await new AdminService().getStats();

    expect(stats.quizzes.totalAttempts).toBe(3);
    expect(stats.quizzes.averageScore).toBeCloseTo(70.3, 1);
  });

  it("buckets today's new users and quiz attempts into a gap-free 14-day trend ending today", async () => {
    await createStudentUser();
    await createStudentUser();
    const { student } = await createStudentUser();
    const subject = await createSubject();
    await prisma.quizResult.create({
      data: { studentId: student.id, subjectId: subject.id, grade: 9, score: 80, level: "STRONG", attemptDate: new Date() },
    });

    const stats = await new AdminService().getStats();

    expect(stats.users.newUsersTrend).toHaveLength(14);
    expect(stats.quizzes.attemptsTrend).toHaveLength(14);
    const todayKey = new Date().toISOString().slice(0, 10);
    expect(stats.users.newUsersTrend.at(-1)).toEqual({ date: todayKey, count: 3 });
    expect(stats.quizzes.attemptsTrend.at(-1)).toEqual({ date: todayKey, count: 1 });
  });

  it("computes students-by-grade, engagement, and catalog counts from real rows", async () => {
    const { student: s1 } = await createStudentUser({ grade: 9 });
    const { student: s2 } = await createStudentUser({ grade: 9 });
    const { student: s3 } = await createStudentUser({ grade: 10 });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.progress.create({ data: { studentId: s1.id, date: today, studyMinutes: 20 } });

    const conversation = await prisma.aIConversation.create({ data: { studentId: s2.id, title: "chat" } });
    await prisma.aIMessage.createMany({
      data: [
        { conversationId: conversation.id, role: "USER", content: "hi" },
        { conversationId: conversation.id, role: "ASSISTANT", content: "hello" },
      ],
    });

    const badge = await createBadge();
    await prisma.achievement.create({ data: { studentId: s3.id, badgeId: badge.id } });

    await prisma.notification.createMany({
      data: [
        { recipientId: s1.userId, type: "SYSTEM", title: "a", body: "a", read: false },
        { recipientId: s2.userId, type: "SYSTEM", title: "b", body: "b", read: true },
      ],
    });

    await createSubject();
    await createSubject();
    const subjectForQuestions = await createSubject();
    await prisma.question.createMany({
      data: [1, 2, 3].map((i) => ({
        subjectId: subjectForQuestions.id,
        grade: 9,
        text: `q${i}`,
        textRu: `q${i}`,
        options: ["a", "b"],
        optionsRu: ["a", "b"],
        correctIndex: 0,
      })),
    });
    await createCareer();
    await prisma.university.create({ data: { nameUz: "Test University", nameRu: "Test University", country: "UZ", city: "Toshkent" } });

    const stats = await new AdminService().getStats();

    expect(stats.studentsByGrade).toEqual([
      { grade: 9, count: 2 },
      { grade: 10, count: 1 },
    ]);
    expect(stats.engagement).toEqual({
      activeStudentsToday: 1,
      aiConversations: 1,
      aiMessages: 2,
      totalAchievements: 1,
      unreadNotifications: 1,
    });
    expect(stats.catalog).toEqual({ subjects: 3, questions: 3, careers: 1, universities: 1 });
  });
});

describe("AdminService.listUsers (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("returns each user's role-appropriate detail — grade for students, children count for parents", async () => {
    const { parent, user: parentUser } = await createParentUser({ fullName: "Malika Yusupova" });
    const { student, user: studentUser } = await createStudentUser({ fullName: "Bekzod Toshev", grade: 9, parentId: parent.id });
    await createStudentUser({ fullName: "Sevinch Alieva", grade: 10, parentId: parent.id });

    const list = await new AdminService().listUsers();

    const parentRow = list.find((u) => u.id === parentUser.id)!;
    expect(parentRow).toMatchObject({ fullName: "Malika Yusupova", role: "PARENT", grade: null, childrenCount: 2 });

    const studentRow = list.find((u) => u.id === studentUser.id)!;
    expect(studentRow).toMatchObject({ fullName: "Bekzod Toshev", role: "STUDENT", grade: 9, childrenCount: null });
    expect(student.id).toBeTruthy(); // fixture return sanity
  });

  it("gives an admin neither a grade nor a children count", async () => {
    const admin = await prisma.user.create({
      data: { email: "admin-list-test@test.uz", passwordHash: "x", fullName: "Admin User", role: Role.ADMIN },
    });

    const list = await new AdminService().listUsers();

    const adminRow = list.find((u) => u.id === admin.id)!;
    expect(adminRow).toMatchObject({ role: "ADMIN", grade: null, childrenCount: null });
  });

  it("orders users newest-first", async () => {
    const { user: first } = await createStudentUser();
    const { user: second } = await createStudentUser();
    // Two inserts can land in the same DB timestamp tick — pin explicit,
    // unambiguously-ordered createdAt values so this test never flakes on
    // real execution speed.
    await prisma.user.update({ where: { id: first.id }, data: { createdAt: new Date(Date.now() - 60_000) } });
    await prisma.user.update({ where: { id: second.id }, data: { createdAt: new Date() } });

    const list = await new AdminService().listUsers();

    const firstIndex = list.findIndex((u) => u.id === first.id);
    const secondIndex = list.findIndex((u) => u.id === second.id);
    expect(secondIndex).toBeLessThan(firstIndex);
  });

  it("reports each user's real status — ACTIVE by default, BLOCKED once blocked", async () => {
    const { user: active } = await createStudentUser();
    const { user: blocked } = await createStudentUser();
    await prisma.user.update({ where: { id: blocked.id }, data: { status: "BLOCKED" } });

    const list = await new AdminService().listUsers();

    expect(list.find((u) => u.id === active.id)).toMatchObject({ status: "ACTIVE" });
    expect(list.find((u) => u.id === blocked.id)).toMatchObject({ status: "BLOCKED" });
  });
});

describe("AdminService.updateUserStatus (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("blocks a user, and it's reflected in listUsers afterward", async () => {
    const { user: admin } = await createStudentUser(); // any distinct user id works as "the requesting admin" here
    const { user: target } = await createStudentUser();

    const result = await new AdminService().updateUserStatus(admin.id, target.id, "BLOCKED");

    expect(result).toEqual({ id: target.id, status: "BLOCKED" });
    const list = await new AdminService().listUsers();
    expect(list.find((u) => u.id === target.id)).toMatchObject({ status: "BLOCKED" });
  });

  it("unblocks a previously blocked user", async () => {
    const { user: admin } = await createStudentUser();
    const { user: target } = await createStudentUser();
    await prisma.user.update({ where: { id: target.id }, data: { status: "BLOCKED" } });

    const result = await new AdminService().updateUserStatus(admin.id, target.id, "ACTIVE");

    expect(result).toEqual({ id: target.id, status: "ACTIVE" });
  });

  it("refuses to let an admin block themselves", async () => {
    const { user: admin } = await createStudentUser();

    await expect(new AdminService().updateUserStatus(admin.id, admin.id, "BLOCKED")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("404s for a target user that doesn't exist", async () => {
    const { user: admin } = await createStudentUser();

    await expect(
      new AdminService().updateUserStatus(admin.id, "00000000-0000-0000-0000-000000000000", "BLOCKED")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("AdminService drill-down lists behind clickable stat cards (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("listActiveStudentsToday matches countActiveStudentsToday's count exactly — same underlying definition of 'active'", async () => {
    const { student: activeStudent } = await createStudentUser({ fullName: "Active Student", grade: 9 });
    await createStudentUser({ fullName: "Inactive Student" }); // no Progress row at all today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.progress.create({ data: { studentId: activeStudent.id, date: today, studyMinutes: 25 } });

    const stats = await new AdminService().getStats();
    const list = await new AdminService().listActiveStudentsToday();

    expect(list).toHaveLength(stats.engagement.activeStudentsToday);
    expect(list).toEqual([{ fullName: "Active Student", email: expect.any(String), grade: 9, studyMinutes: 25 }]);
  });

  it("counts a quiz-only student as active today too, with their real quiz minutes shown", async () => {
    const { student: quizStudent } = await createStudentUser({ fullName: "Quiz Only Student", grade: 8 });
    await createStudentUser({ fullName: "Inactive Student" }); // no Progress row at all today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Mirrors quizService: Progress.studyMinutes stays 0 for a quiz-only day,
    // only completedTasks is credited; real time lives on a QUIZ StudySession.
    await prisma.progress.create({ data: { studentId: quizStudent.id, date: today, studyMinutes: 0, completedTasks: 1 } });
    await prisma.studySession.create({
      data: {
        studentId: quizStudent.id,
        startedAt: today,
        completedAt: today,
        minutes: 3,
        seconds: 190,
        status: "COMPLETED",
        source: "QUIZ",
      },
    });

    const stats = await new AdminService().getStats();
    const list = await new AdminService().listActiveStudentsToday();

    expect(list).toHaveLength(stats.engagement.activeStudentsToday);
    expect(list).toEqual([{ fullName: "Quiz Only Student", email: expect.any(String), grade: 8, studyMinutes: 3 }]);
  });

  it("listSubjects reports each subject's real question count, matching catalog.questions in total", async () => {
    const math = await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    const physics = await createSubject({ code: "PHYSICS", nameUz: "Fizika", nameRu: "Физика" });
    await prisma.question.createMany({
      data: [1, 2, 3].map((i) => ({
        subjectId: math.id,
        grade: 9,
        text: `q${i}`,
        textRu: `q${i}`,
        options: ["a", "b"],
        optionsRu: ["a", "b"],
        correctIndex: 0,
      })),
    });
    await prisma.question.create({
      data: { subjectId: physics.id, grade: 9, text: "q1", textRu: "q1", options: ["a", "b"], optionsRu: ["a", "b"], correctIndex: 0 },
    });

    const stats = await new AdminService().getStats();
    const subjects = await new AdminService().listSubjects();

    const totalQuestions = subjects.reduce((sum, s) => sum + s.questionCount, 0);
    expect(totalQuestions).toBe(stats.catalog.questions);
    expect(subjects.find((s) => s.code === "MATH")?.questionCount).toBe(3);
    expect(subjects.find((s) => s.code === "PHYSICS")?.questionCount).toBe(1);
  });

  it("listCareers and listUniversities return the real catalog rows", async () => {
    await createCareer({ code: "DOCTOR", nameUz: "Shifokor", nameRu: "Врач" });
    await prisma.university.create({ data: { nameUz: "TATU", nameRu: "TATU", country: "UZ", city: "Toshkent" } });

    const careers = await new AdminService().listCareers();
    const universities = await new AdminService().listUniversities();

    expect(careers.map((c) => c.code)).toContain("DOCTOR");
    expect(universities.map((u) => u.nameUz)).toContain("TATU");
  });
});
