import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { StudentService } from "../../src/services/studentService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createParentUser, createStudentUser, createSubject } from "../helpers/fixtures";

describe("StudentService.getDashboardSummary — todaySubjectCount (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("counts each distinct subject only once even with multiple quiz attempts today", async () => {
    const { student } = await createStudentUser();
    const math = await createSubject({ code: "MATH" });
    await prisma.quizResult.createMany({
      data: [
        { studentId: student.id, subjectId: math.id, grade: 9, score: 60, level: "MEDIUM", attemptDate: new Date() },
        { studentId: student.id, subjectId: math.id, grade: 9, score: 90, level: "STRONG", attemptDate: new Date() },
      ],
    });

    const summary = await new StudentService().getDashboardSummary(student.id);

    expect(summary.todaySubjectCount).toBe(1);
  });

  it("does not count a quiz attempt from a previous day", async () => {
    const { student } = await createStudentUser();
    const math = await createSubject({ code: "MATH" });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await prisma.quizResult.create({
      data: { studentId: student.id, subjectId: math.id, grade: 9, score: 60, level: "MEDIUM", attemptDate: yesterday },
    });

    const summary = await new StudentService().getDashboardSummary(student.id);

    expect(summary.todaySubjectCount).toBe(0);
  });

  it("counts multiple distinct subjects attempted today", async () => {
    const { student } = await createStudentUser();
    const subjects = await Promise.all([1, 2, 3, 4, 5].map((i) => createSubject({ code: `SUBJ${i}` })));
    await prisma.quizResult.createMany({
      data: subjects.map((s) => ({
        studentId: student.id,
        subjectId: s.id,
        grade: 9,
        score: 70,
        level: "MEDIUM" as const,
        attemptDate: new Date(),
      })),
    });

    const summary = await new StudentService().getDashboardSummary(student.id);

    expect(summary.todaySubjectCount).toBe(5);
  });
});

describe("StudentService.linkParent — linking a parent after sign-up (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("links an existing student to a parent who registered later, and the profile then shows that parent", async () => {
    const { student } = await createStudentUser();
    const { user: parentUser, parent } = await createParentUser({ fullName: "Malika Yusupova" });
    const service = new StudentService();

    const result = await service.linkParent(student.id, parentUser.email);
    const profile = await service.getProfile(student.id, "uz");

    expect(result.parent).toEqual({ fullName: "Malika Yusupova", email: parentUser.email });
    expect((await prisma.student.findUnique({ where: { id: student.id } }))?.parentId).toBe(parent.id);
    expect(profile.parent).toEqual({ fullName: "Malika Yusupova", email: parentUser.email });
  });

  it("rejects an email with no parent account (404) and leaves the current link untouched", async () => {
    const { parent } = await createParentUser();
    const { student } = await createStudentUser({ parentId: parent.id });

    await expect(new StudentService().linkParent(student.id, "nobody@mail.uz")).rejects.toMatchObject({ statusCode: 404 });
    expect((await prisma.student.findUnique({ where: { id: student.id } }))?.parentId).toBe(parent.id);
  });

  it("never links to a non-parent account, even if that email exists", async () => {
    const { student } = await createStudentUser();
    const { user: otherStudentUser } = await createStudentUser();

    await expect(new StudentService().linkParent(student.id, otherStudentUser.email)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("reports no parent on the profile when none is linked", async () => {
    const { student } = await createStudentUser();

    expect((await new StudentService().getProfile(student.id, "uz")).parent).toBeNull();
  });
});
