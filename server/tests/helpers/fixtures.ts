import { Role } from "@prisma/client";
import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/utils/password";

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

// bcrypt hashing (12 rounds) is real, deliberately slow work — hashing once
// per test process instead of once per fixture keeps the suite fast without
// faking the password path itself.
let cachedPasswordHash: Promise<string> | null = null;
function testPasswordHash(): Promise<string> {
  cachedPasswordHash ??= hashPassword("Test1234!");
  return cachedPasswordHash;
}

export async function createStudentUser(
  overrides: { grade?: number; fullName?: string; parentId?: string; topSubject?: string; region?: string } = {}
) {
  const passwordHash = await testPasswordHash();
  const user = await prisma.user.create({
    data: {
      email: `${unique("student")}@test.uz`,
      passwordHash,
      fullName: overrides.fullName ?? "Test Student",
      role: Role.STUDENT,
    },
  });
  const student = await prisma.student.create({
    data: {
      userId: user.id,
      grade: overrides.grade ?? 9,
      parentId: overrides.parentId,
      region: overrides.region,
    },
  });
  // A strong quiz-derived level in `topSubject` — the signal the career
  // module uses to pick which subject's universities to show.
  if (overrides.topSubject) {
    const subject = await createSubject({ code: overrides.topSubject });
    await prisma.subjectLevel.create({ data: { studentId: student.id, subjectId: subject.id, level: "STRONG", score: 100, source: "quiz" } });
  }
  return { user, student };
}

export async function createParentUser(overrides: { fullName?: string } = {}) {
  const passwordHash = await testPasswordHash();
  const user = await prisma.user.create({
    data: {
      email: `${unique("parent")}@test.uz`,
      passwordHash,
      fullName: overrides.fullName ?? "Test Parent",
      role: Role.PARENT,
    },
  });
  const parent = await prisma.parent.create({ data: { userId: user.id } });
  return { user, parent };
}

export function createSubject(overrides: { code?: string; nameUz?: string; nameRu?: string } = {}) {
  const code = overrides.code ?? unique("SUBJ");
  // Upsert by code: a test may create the same subject both via
  // createStudentUser({ topSubject }) and directly, with real names.
  return prisma.subject.upsert({
    where: { code },
    create: { code, nameUz: overrides.nameUz ?? code, nameRu: overrides.nameRu ?? code, active: true },
    update: { ...(overrides.nameUz && { nameUz: overrides.nameUz }), ...(overrides.nameRu && { nameRu: overrides.nameRu }) },
  });
}

export function createCareer(overrides: {
  code?: string;
  nameUz?: string;
  nameRu?: string;
  description?: string;
  minGrade?: number;
  requiredSubjects?: string[];
  requiredSkills?: string[];
} = {}) {
  const code = overrides.code ?? unique("CAREER");
  return prisma.career.create({
    data: {
      code,
      nameUz: overrides.nameUz ?? code,
      nameRu: overrides.nameRu ?? code,
      description: overrides.description ?? "Test career",
      minGrade: overrides.minGrade ?? 9,
      requiredSubjects: overrides.requiredSubjects ?? [],
      requiredSkills: overrides.requiredSkills ?? [],
    },
  });
}

export function createBadge(overrides: { code?: string } = {}) {
  const code = overrides.code ?? unique("BADGE");
  return prisma.badge.create({
    data: {
      code,
      nameUz: code,
      nameRu: code,
      description: "Test badge",
      descriptionRu: "Test badge",
      icon: "🏅",
    },
  });
}

export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
