import { PrismaClient, Role } from "@prisma/client";

export class UserRepository {
  constructor(private db: PrismaClient) {}

  // Case-insensitive: new emails are stored lowercased (see authValidators),
  // but accounts created before that may still hold mixed-case ones.
  findByEmail(email: string) {
    return this.db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: { student: true, parent: true },
    });
  }

  findById(id: string) {
    return this.db.user.findUnique({ where: { id }, include: { student: true, parent: true } });
  }

  // fullName included: Prisma's generated UserCreateInput requires it (schema:
  // `fullName String` is non-optional, no default) — this method's parameter
  // type was missing it, which is exactly the reported build error.
  createUser(data: { email: string; passwordHash: string; fullName: string; role: Role }) {
    return this.db.user.create({ data });
  }

  storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.db.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  findRefreshToken(tokenHash: string) {
    return this.db.refreshToken.findFirst({ where: { tokenHash, revokedAt: null } });
  }

  revokeRefreshToken(id: string) {
    return this.db.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }
}
