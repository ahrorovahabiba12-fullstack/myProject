import { PrismaClient } from "@prisma/client";

export class StudentRepository {
  constructor(private db: PrismaClient) {}

  create(data: { userId: string; parentId?: string; grade: number }) {
    return this.db.student.create({ data });
  }

  findByUserId(userId: string) {
    return this.db.student.findUnique({
      where: { userId },
      include: { subjectLevels: { include: { subject: true } }, user: true },
    });
  }

  findById(id: string) {
    return this.db.student.findUnique({
      where: { id },
      include: { subjectLevels: { include: { subject: true } }, user: true },
    });
  }

  findByParentId(parentId: string) {
    return this.db.student.findMany({ where: { parentId }, include: { user: true } });
  }

  belongsToParent(studentId: string, parentId: string) {
    return this.db.student.findFirst({ where: { id: studentId, parentId } });
  }

  findGrade(id: string) {
    return this.db.student.findUnique({ where: { id }, select: { grade: true } });
  }

  findLinkedParent(id: string) {
    return this.db.student.findUnique({
      where: { id },
      select: { parent: { select: { user: { select: { fullName: true, email: true } } } } },
    });
  }

  setParent(id: string, parentId: string) {
    return this.db.student.update({ where: { id }, data: { parentId } });
  }

  updateProfile(
    id: string,
    data: Partial<{ interests: string[]; favoriteSubjects: string[]; goals: string[]; careerInterests: string[]; region: string | null }>
  ) {
    return this.db.student.update({ where: { id }, data });
  }
}
